import React, { 
  useEffect, 
  useRef, 
  useState, 
  forwardRef, 
  useImperativeHandle, 
  createContext, 
  useContext 
} from 'react';
import {
  ScrollView,
  ScrollViewProps,
  Keyboard,
  Platform,
  Dimensions,
  TextInput,
  TextInputProps,
  NativeSyntheticEvent,
  NativeScrollEvent,
  UIManager
} from 'react-native';

interface KeyboardAwareContextType {
  scrollInputIntoView: (targetNode?: any) => void;
}

export const KeyboardAwareContext = createContext<KeyboardAwareContextType>({
  scrollInputIntoView: () => {},
});

export const useKeyboardAware = () => useContext(KeyboardAwareContext);

/**
 * Drop-in replacement for TextInput that automatically registers itself with
 * the parent KeyboardAwareScrollView and requests auto-scroll on focus.
 */
export const KeyboardAwareTextInput = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const localRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => localRef.current as TextInput);
  const { scrollInputIntoView } = useKeyboardAware();

  return (
    <TextInput
      ref={localRef}
      {...props}
      onFocus={(e) => {
        scrollInputIntoView(localRef.current);
        props.onFocus?.(e);
      }}
    />
  );
});
KeyboardAwareTextInput.displayName = 'KeyboardAwareTextInput';

export { 
  calculateScrollDelta, 
  ScrollDeltaParams, 
  ScrollDeltaResult 
} from '../../utils/keyboardAvoidanceUtils';
import { calculateScrollDelta } from '../../utils/keyboardAvoidanceUtils';

export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  /**
   * Extra margin in pixels between the bottom of the focused input and the top of the keyboard.
   * Default: 45px
   */
  extraScrollHeight?: number;
  /**
   * Extra top offset (e.g. For sticky headers or top navigation bars).
   * Default: 70px
   */
  topOffset?: number;
  /**
   * When true, automatically adjusts content insets on keyboard show.
   * Default: true
   */
  enableAutomaticScroll?: boolean;
}

export const KeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>((
  {
    children,
    extraScrollHeight = 45,
    topOffset = 70,
    enableAutomaticScroll = true,
    contentContainerStyle,
    onScroll,
    scrollEventThrottle = 16,
    keyboardShouldPersistTaps = 'handled',
    showsVerticalScrollIndicator = false,
    ...props
  },
  ref
) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const currentScrollY = useRef<number>(0);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const keyboardHeightRef = useRef<number>(0);
  const currentlyFocusedNodeRef = useRef<any>(null);

  // Expose inner ScrollView methods to outer ref
  useImperativeHandle(ref, () => scrollViewRef.current as ScrollView);

  const scrollInputIntoView = (targetNode?: any) => {
    if (!enableAutomaticScroll) return;

    if (targetNode) {
      currentlyFocusedNodeRef.current = targetNode;
    }

    // Delay ensures keyboard animation has initiated or finished resizing
    setTimeout(() => {
      const activeKeyboardHeight = keyboardHeightRef.current;
      if (activeKeyboardHeight <= 0) return;

      const node = targetNode || currentlyFocusedNodeRef.current || (
        TextInput.State?.currentlyFocusedInput 
          ? TextInput.State.currentlyFocusedInput() 
          : (TextInput.State?.currentlyFocusedField ? TextInput.State.currentlyFocusedField() : null)
      );
      if (!node) return;

      const screenHeight = Dimensions.get('screen').height;
      const windowHeight = Dimensions.get('window').height;

      const handleMeasurement = (_x: number, y: number, _width: number, height: number) => {
        if (y === undefined || height === undefined) return;

        const { shouldScroll, targetY } = calculateScrollDelta({
          inputY: y,
          inputHeight: height,
          extraScrollHeight,
          windowHeight,
          screenHeight,
          keyboardHeight: activeKeyboardHeight,
          isAndroid: Platform.OS === 'android',
          topOffset,
          currentScrollY: currentScrollY.current,
        });

        if (shouldScroll) {
          scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
        }
      };

      if (typeof node.measureInWindow === 'function') {
        node.measureInWindow(handleMeasurement);
      } else if (typeof node === 'number' && UIManager?.measureInWindow) {
        UIManager.measureInWindow(node, handleMeasurement);
      } else if (node?._nativeTag && UIManager?.measureInWindow) {
        UIManager.measureInWindow(node._nativeTag, handleMeasurement);
      }
    }, Platform.OS === 'ios' ? 80 : 160);
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (e: any) => {
      const kh = e?.endCoordinates?.height || 0;
      keyboardHeightRef.current = kh;
      setKeyboardHeight(kh);
      scrollInputIntoView(currentlyFocusedNodeRef.current);
    };

    const handleHide = () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
      currentlyFocusedNodeRef.current = null;
    };

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);

    let frameSub: any = null;
    if (Platform.OS === 'ios') {
      frameSub = Keyboard.addListener('keyboardWillChangeFrame', handleShow);
    }

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
    };
  }, [extraScrollHeight, topOffset, enableAutomaticScroll]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    currentScrollY.current = event.nativeEvent.contentOffset.y;
    if (onScroll) {
      onScroll(event);
    }
  };

  const screenHeight = Dimensions.get('screen').height;
  const windowHeight = Dimensions.get('window').height;
  const isWindowAlreadyResized = Platform.OS === 'android' && (screenHeight - windowHeight >= keyboardHeight * 0.7);
  const dynamicPaddingBottom = keyboardHeight > 0 
    ? (isWindowAlreadyResized ? extraScrollHeight : (keyboardHeight + extraScrollHeight)) 
    : 0;

  // Dynamic bottom padding ensures any input—even at the bottom of the form—can scroll above keyboard
  const dynamicContainerStyle = [
    contentContainerStyle,
    dynamicPaddingBottom > 0 && { paddingBottom: dynamicPaddingBottom }
  ];

  return (
    <KeyboardAwareContext.Provider value={{ scrollInputIntoView }}>
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={dynamicContainerStyle}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAwareContext.Provider>
  );
});

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';

export interface ScrollDeltaParams {
  inputY: number;
  inputHeight: number;
  extraScrollHeight?: number;
  windowHeight: number;
  screenHeight: number;
  keyboardHeight: number;
  isAndroid?: boolean;
  topOffset?: number;
  currentScrollY?: number;
}

export interface ScrollDeltaResult {
  shouldScroll: boolean;
  targetY: number;
  scrollDelta: number;
}

/**
 * Calculates the exact scroll adjustment required to guarantee that a focused input
 * is never occluded by the soft keyboard on either iOS or Android.
 * 
 * Invariants:
 * - On Android with adjustResize, detects if the window was already shrunk by the OS
 *   to avoid double-subtraction.
 * - Leaves `extraScrollHeight` breathing room between the bottom of the input and the keyboard.
 * - Handles negative scroll if an input was pushed too high under a sticky header.
 * - No-op when keyboard is closed (keyboardHeight <= 0) or input is safely visible.
 */
export function calculateScrollDelta({
  inputY,
  inputHeight,
  extraScrollHeight = 45,
  windowHeight,
  screenHeight,
  keyboardHeight,
  isAndroid = false,
  topOffset = 70,
  currentScrollY = 0,
}: ScrollDeltaParams): ScrollDeltaResult {
  if (keyboardHeight <= 0) {
    return { shouldScroll: false, targetY: currentScrollY, scrollDelta: 0 };
  }

  // Detect if Android adjustResize already shrank the root window height
  const isWindowAlreadyResized = isAndroid && (screenHeight - windowHeight >= keyboardHeight * 0.7);
  const visibleScreenBottom = isWindowAlreadyResized 
    ? windowHeight 
    : (windowHeight - keyboardHeight);

  const inputBottom = inputY + inputHeight;

  // If input bottom is occluded or too close to keyboard top edge
  if (inputBottom + extraScrollHeight > visibleScreenBottom) {
    const scrollDelta = (inputBottom + extraScrollHeight) - visibleScreenBottom;
    return {
      shouldScroll: true,
      targetY: Math.max(0, currentScrollY + scrollDelta),
      scrollDelta,
    };
  } else if (inputY < topOffset) {
    // If input is scrolled too high beneath top header/status bar
    const scrollDelta = topOffset - inputY;
    return {
      shouldScroll: true,
      targetY: Math.max(0, currentScrollY - scrollDelta),
      scrollDelta: -scrollDelta,
    };
  }

  return { shouldScroll: false, targetY: currentScrollY, scrollDelta: 0 };
}

import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { TextInput, StyleSheet, View, Text, TextInputProps } from 'react-native';
import { useKeyboardAware } from './KeyboardAwareScrollView';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(({ label, error, style, onFocus, ...props }, ref) => {
  const localInputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => localInputRef.current as TextInput);
  const { scrollInputIntoView } = useKeyboardAware();

  const handleFocus = (e: any) => {
    scrollInputIntoView(localInputRef.current);
    if (onFocus) {
      onFocus(e);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        ref={localInputRef}
        style={[
          styles.input,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor="#999"
        onFocus={handleFocus}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#333',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});

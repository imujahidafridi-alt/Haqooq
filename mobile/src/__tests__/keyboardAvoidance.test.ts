import { calculateScrollDelta } from '../utils/keyboardAvoidanceUtils';

describe('calculateScrollDelta - Keyboard Avoidance Calculations', () => {
  it('detects occlusion on iOS and calculates exact positive scroll delta', () => {
    // Screen height: 800, Keyboard height: 300 -> Visible bottom is 500
    // Input is at y=520, height=50 -> inputBottom = 570
    // With extraScrollHeight=45, required position is 570 + 45 = 615
    // Delta needed to clear keyboard: 615 - 500 = 115
    const result = calculateScrollDelta({
      inputY: 520,
      inputHeight: 50,
      extraScrollHeight: 45,
      windowHeight: 800,
      screenHeight: 800,
      keyboardHeight: 300,
      isAndroid: false,
      topOffset: 70,
      currentScrollY: 100,
    });

    expect(result.shouldScroll).toBe(true);
    expect(result.scrollDelta).toBe(115);
    expect(result.targetY).toBe(215); // 100 + 115
  });

  it('detects when Android adjustResize already shrank the window and avoids double-subtraction', () => {
    // On Android with adjustResize:
    // screenHeight: 800, but windowHeight is already 500 because OS resized window
    // keyboardHeight: 300
    // visibleScreenBottom should be 500 (NOT 500 - 300 = 200!)
    const result = calculateScrollDelta({
      inputY: 480,
      inputHeight: 40,
      extraScrollHeight: 40,
      windowHeight: 500, // already resized by Android
      screenHeight: 800,
      keyboardHeight: 300,
      isAndroid: true,
      topOffset: 70,
      currentScrollY: 0,
    });

    // inputBottom = 480 + 40 = 520
    // inputBottom + 40 = 560
    // visibleScreenBottom = 500
    // delta = 560 - 500 = 60
    expect(result.shouldScroll).toBe(true);
    expect(result.scrollDelta).toBe(60);
    expect(result.targetY).toBe(60);
  });

  it('returns shouldScroll = false when input is comfortably visible above keyboard', () => {
    // Window: 800, Keyboard: 280 -> visible bottom: 520
    // Input at y: 200, height: 45 -> inputBottom: 245
    // 245 + 45 = 290 < 520 -> safely visible
    const result = calculateScrollDelta({
      inputY: 200,
      inputHeight: 45,
      extraScrollHeight: 45,
      windowHeight: 800,
      screenHeight: 800,
      keyboardHeight: 280,
      isAndroid: false,
      topOffset: 70,
      currentScrollY: 50,
    });

    expect(result.shouldScroll).toBe(false);
    expect(result.scrollDelta).toBe(0);
    expect(result.targetY).toBe(50);
  });

  it('scrolls back down if input is occluded by sticky header / top bar', () => {
    // Input is scrolled too far up beneath a 70px header (y = 20)
    const result = calculateScrollDelta({
      inputY: 20,
      inputHeight: 40,
      extraScrollHeight: 45,
      windowHeight: 800,
      screenHeight: 800,
      keyboardHeight: 300,
      isAndroid: false,
      topOffset: 70,
      currentScrollY: 150,
    });

    expect(result.shouldScroll).toBe(true);
    // Delta needed to push down from y=20 to y=70: 70 - 20 = 50
    expect(result.scrollDelta).toBe(-50);
    expect(result.targetY).toBe(100); // 150 - 50
  });

  it('does nothing when keyboard is closed (keyboardHeight <= 0)', () => {
    const result = calculateScrollDelta({
      inputY: 600,
      inputHeight: 50,
      extraScrollHeight: 45,
      windowHeight: 800,
      screenHeight: 800,
      keyboardHeight: 0,
      isAndroid: false,
      topOffset: 70,
      currentScrollY: 0,
    });

    expect(result.shouldScroll).toBe(false);
    expect(result.scrollDelta).toBe(0);
  });

  it('handles large multiline text inputs near bottom', () => {
    // 120px tall text area at y=450
    // window=800, keyboard=320 -> visible bottom = 480
    // inputBottom = 450 + 120 = 570
    // 570 + 45 = 615 -> delta = 615 - 480 = 135
    const result = calculateScrollDelta({
      inputY: 450,
      inputHeight: 120,
      extraScrollHeight: 45,
      windowHeight: 800,
      screenHeight: 800,
      keyboardHeight: 320,
      isAndroid: false,
      topOffset: 70,
      currentScrollY: 200,
    });

    expect(result.shouldScroll).toBe(true);
    expect(result.scrollDelta).toBe(135);
    expect(result.targetY).toBe(335); // 200 + 135
  });
});

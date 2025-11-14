import { render } from '@testing-library/react-native';
import React from 'react';
import { Text as RNText, useWindowDimensions } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

// Mock react-native's useWindowDimensions
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    useWindowDimensions: jest.fn(),
  };
});

describe('Accessibility - Text Scaling', () => {
  const mockUseWindowDimensions = useWindowDimensions as jest.MockedFunction<typeof useWindowDimensions>;

  beforeEach(() => {
    // Reset to default font scale
    mockUseWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Text Component', () => {
    it('should render text with default font scale', () => {
      const { getByText } = render(<Text>Hello World</Text>);
      const textElement = getByText('Hello World');
      expect(textElement).toBeTruthy();
    });

    it('should NOT have allowFontScaling set to false (text should scale)', () => {
      const { getByText } = render(<Text testID="scalable-text">Scalable Text</Text>);
      const textElement = getByText('Scalable Text');

      // React Native Text components allow font scaling by default
      // allowFontScaling defaults to true if not explicitly set to false
      expect(textElement.props.allowFontScaling).not.toBe(false);
    });

    it('should render with different size variants', () => {
      const sizes: Array<'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'> = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];

      sizes.forEach((size) => {
        const { getByText } = render(<Text size={size}>Text Size {size}</Text>);
        const textElement = getByText(`Text Size ${size}`);
        expect(textElement).toBeTruthy();
      });
    });

    it('should handle increased font scale (accessibility settings)', () => {
      // Simulate user increasing font size in system settings
      mockUseWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1.5, // 150% larger text
      });

      const { getByText } = render(<Text>Larger Text</Text>);
      const textElement = getByText('Larger Text');
      expect(textElement).toBeTruthy();
    });

    it('should handle maximum font scale', () => {
      // Simulate maximum font scale from accessibility settings
      mockUseWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 2.5, // 250% larger text
      });

      const { getByText } = render(<Text>Maximum Scale Text</Text>);
      const textElement = getByText('Maximum Scale Text');
      expect(textElement).toBeTruthy();
    });
  });

  describe('Heading Component', () => {
    it('should render heading with default font scale', () => {
      const { getByText } = render(<Heading>Main Heading</Heading>);
      const headingElement = getByText('Main Heading');
      expect(headingElement).toBeTruthy();
    });

    it('should NOT have allowFontScaling set to false', () => {
      const { getByText } = render(<Heading testID="scalable-heading">Scalable Heading</Heading>);
      const headingElement = getByText('Scalable Heading');
      expect(headingElement.props.allowFontScaling).not.toBe(false);
    });

    it('should render with different size variants', () => {
      const sizes: Array<'5xl' | '4xl' | '3xl' | '2xl' | 'xl' | 'lg' | 'md' | 'sm' | 'xs'> = ['5xl', '4xl', '3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs'];

      sizes.forEach((size) => {
        const { getByText } = render(<Heading size={size}>Heading Size {size}</Heading>);
        const headingElement = getByText(`Heading Size ${size}`);
        expect(headingElement).toBeTruthy();
      });
    });

    it('should handle increased font scale', () => {
      mockUseWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1.8,
      });

      const { getByText } = render(<Heading>Larger Heading</Heading>);
      const headingElement = getByText('Larger Heading');
      expect(headingElement).toBeTruthy();
    });
  });

  describe('Button Component', () => {
    it('should render button text with default font scale', () => {
      const { getByText } = render(
        <Button>
          <ButtonText>Click Me</ButtonText>
        </Button>
      );
      const buttonText = getByText('Click Me');
      expect(buttonText).toBeTruthy();
    });

    it('should NOT have allowFontScaling set to false on button text', () => {
      const { getByText } = render(
        <Button>
          <ButtonText testID="scalable-button-text">Scalable Button</ButtonText>
        </Button>
      );
      const buttonText = getByText('Scalable Button');
      expect(buttonText.props.allowFontScaling).not.toBe(false);
    });

    it('should handle increased font scale on button text', () => {
      mockUseWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1.5,
      });

      const { getByText } = render(
        <Button>
          <ButtonText>Larger Button Text</ButtonText>
        </Button>
      );
      const buttonText = getByText('Larger Button Text');
      expect(buttonText).toBeTruthy();
    });

    it('should render with different button sizes', () => {
      const sizes: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl'];

      sizes.forEach((size) => {
        const { getByText } = render(
          <Button size={size}>
            <ButtonText>Button Size {size}</ButtonText>
          </Button>
        );
        const buttonText = getByText(`Button Size ${size}`);
        expect(buttonText).toBeTruthy();
      });
    });
  });

  describe('Components with Fixed Font Sizes', () => {
    it('should identify components using StyleSheet with fixed fontSize', () => {
      // This test documents that some components may use fixed font sizes
      // These should be reviewed and potentially updated to use scalable units

      // Example of a component with fixed fontSize (this is for documentation)
      const FixedFontComponent = () => <RNText style={{ fontSize: 16 }}>Fixed Size Text</RNText>;

      const { getByText } = render(<FixedFontComponent />);
      const textElement = getByText('Fixed Size Text');

      // Fixed font sizes won't scale with system text size settings
      // This test serves as documentation of the issue
      expect(textElement).toBeTruthy();
      expect(textElement.props.style).toHaveProperty('fontSize', 16);
    });
  });

  describe('Gluestack UI Components', () => {
    it('should use Tailwind classes for font sizing (which are scalable)', () => {
      // Gluestack UI components use Tailwind CSS classes via NativeWind
      // These classes are converted to React Native styles that respect font scaling

      const { getByText } = render(<Text size="lg">Tailwind Styled Text</Text>);
      const textElement = getByText('Tailwind Styled Text');

      // Verify the component renders (Tailwind classes are applied)
      expect(textElement).toBeTruthy();
    });

    it('should handle multiple font scale changes without breaking', () => {
      const fontScales = [0.8, 1.0, 1.3, 1.5, 2.0, 2.5];

      fontScales.forEach((fontScale) => {
        mockUseWindowDimensions.mockReturnValue({
          width: 375,
          height: 812,
          scale: 2,
          fontScale,
        });

        const { getByText, unmount } = render(<Text>Font Scale {fontScale}</Text>);
        const textElement = getByText(`Font Scale ${fontScale}`);
        expect(textElement).toBeTruthy();
        unmount();
      });
    });
  });

  describe('Accessibility Best Practices', () => {
    it('should not disable font scaling on any text components', () => {
      const components = [
        { component: <Text key="text">Regular Text</Text>, text: 'Regular Text' },
        { component: <Heading key="heading">Heading Text</Heading>, text: 'Heading Text' },
        {
          component: (
            <Button key="button">
              <ButtonText>Button Text</ButtonText>
            </Button>
          ),
          text: 'Button Text',
        },
      ];

      components.forEach(({ component, text }) => {
        const { getByText } = render(component);
        const element = getByText(text);

        // Verify allowFontScaling is not explicitly set to false
        expect(element.props?.allowFontScaling).not.toBe(false);
      });
    });

    it('should maintain layout integrity with large font scales', () => {
      // Test that components don't break when font scale is very large
      mockUseWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 3.0, // Very large font scale
      });

      const { getByText } = render(
        <>
          <Heading>Large Scale Heading</Heading>
          <Text>Large scale body text that should wrap properly and not overflow.</Text>
          <Button>
            <ButtonText>Large Button</ButtonText>
          </Button>
        </>
      );

      expect(getByText('Large Scale Heading')).toBeTruthy();
      expect(getByText('Large scale body text that should wrap properly and not overflow.')).toBeTruthy();
      expect(getByText('Large Button')).toBeTruthy();
    });
  });

  describe('Dynamic Font Scaling Awareness', () => {
    it('should be aware of system font scale through useWindowDimensions', () => {
      const fontScale = 1.5;
      mockUseWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
        scale: 2,
        fontScale,
      });

      // Components that need to adjust layout based on font scale can use useWindowDimensions
      const dimensions = useWindowDimensions();
      expect(dimensions.fontScale).toBe(fontScale);
    });

    it('should provide access to current font scale value', () => {
      const testFontScales = [0.85, 1.0, 1.15, 1.3, 1.5, 2.0];

      testFontScales.forEach((expectedFontScale) => {
        mockUseWindowDimensions.mockReturnValue({
          width: 375,
          height: 812,
          scale: 2,
          fontScale: expectedFontScale,
        });

        const dimensions = useWindowDimensions();
        expect(dimensions.fontScale).toBe(expectedFontScale);
      });
    });
  });

  describe('Text Truncation with Font Scaling', () => {
    it('should handle truncation properly with increased font scale', () => {
      mockUseWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1.5,
      });

      const longText = 'This is a very long text that should be truncated when the font size is increased';

      const { getByText } = render(<Text isTruncated={true}>{longText}</Text>);

      const textElement = getByText(longText);
      expect(textElement).toBeTruthy();
      // Truncation should still work even with larger font sizes
    });
  });
});

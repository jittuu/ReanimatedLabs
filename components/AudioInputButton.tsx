import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import {
  LongPressGestureHandler,
  LongPressGestureHandlerGestureEvent,
  State,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
} from "react-native-reanimated";

const ITEM_WIDTH = 50;

interface AudioInputButtonProps {
  onStartRecording: () => void;
  onEndRecording: (cancelled: boolean) => void;
}
const AudioInputButton: React.FC<AudioInputButtonProps> = ({
  onStartRecording,
  onEndRecording,
}) => {
  const showRecordCancel = useSharedValue(false);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const cancelling = useDerivedValue(() => {
    return (
      translateY.value < -(100 - ITEM_WIDTH) &&
      translateY.value > -100 &&
      translateX.value > -ITEM_WIDTH / 2 &&
      translateX.value < ITEM_WIDTH / 2
    );
  }, []);
  const aniStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: cancelling.value ? "#ef4444" : "#6c6c6c",
      transform: [
        { translateY: -100 },
        {
          translateX: withTiming(
            showRecordCancel.value ? -ITEM_WIDTH / 2 : 100
          ),
        },
      ],
    };
  }, []);

  const onLongPressGestureHandler =
    useAnimatedGestureHandler<LongPressGestureHandlerGestureEvent>(
      {
        onActive: (nativeEvent) => {
          translateY.value = nativeEvent.y;
          translateX.value = nativeEvent.x;
        },
      },
      []
    );
  return (
    <View>
      <LongPressGestureHandler
        onGestureEvent={onLongPressGestureHandler}
        onHandlerStateChange={(e) => {
          if (e.nativeEvent.state === State.ACTIVE) {
            showRecordCancel.value = true;
            onStartRecording();
          }
          if (e.nativeEvent.state === State.END) {
            showRecordCancel.value = false;
            console.log(`recording end with cancel: (${cancelling.value})`);
            onEndRecording(cancelling.value);
          }
        }}
      >
        <Animated.View
          style={{
            width: ITEM_WIDTH,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome color="#6c6c6c" name="microphone" size={24} />
        </Animated.View>
      </LongPressGestureHandler>
      <Animated.View
        style={[
          {
            backgroundColor: "#d9d9d9",
            width: ITEM_WIDTH,
            height: ITEM_WIDTH,
            borderRadius: ITEM_WIDTH / 2,
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
            right: 0,
            top: 0,
            transform: [{ translateY: -100 }, { translateX: 100 }],
          },
          aniStyle,
        ]}
      >
        <FontAwesome color="#fff" name="close" size={24} />
      </Animated.View>
    </View>
  );
};

export default AudioInputButton;

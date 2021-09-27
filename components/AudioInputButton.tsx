import { FontAwesome } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  HandlerStateChangeEvent,
  LongPressGestureHandler,
  LongPressGestureHandlerEventPayload,
  LongPressGestureHandlerGestureEvent,
  State,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
  interpolate,
  withSpring,
  Extrapolate,
} from "react-native-reanimated";
import { Audio } from "expo-av";

const ITEM_WIDTH = 50;

const useRecording = () => {
  const [recordStatus, setRecordStatus] =
    useState<Audio.RecordingStatus | null>(null);
  const isRecording = useSharedValue(false);

  const onRecordingStatusUpdate = useCallback(
    (status: Audio.RecordingStatus) => {
      setRecordStatus(status);
      isRecording.value = status.isRecording;
    },
    []
  );

  return { isRecording, recordStatus, onRecordingStatusUpdate };
};

export interface RecordingResult {
  isCancelled: boolean;
  uri?: string | null;
}
interface AudioInputButtonProps {
  onStartRecording: () => void;
  onEndRecording: (result: RecordingResult) => void;
}
const AudioInputButton: React.FC<AudioInputButtonProps> = ({
  onStartRecording,
  onEndRecording,
}) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const cancelling = useDerivedValue(() => {
    return (
      translateY.value < -(100 - ITEM_WIDTH) &&
      translateY.value > -100 &&
      translateX.value > 0 &&
      translateX.value < ITEM_WIDTH
    );
  }, []);

  const { isRecording, recordStatus, onRecordingStatusUpdate } = useRecording();

  const aniStyle = useAnimatedStyle(() => {
    return {
      opacity: cancelling.value ? 0.5 : 1,
      transform: [
        { translateY: -100 },
        {
          translateX: withTiming(isRecording.value ? 0 : 100),
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

  const recorder = useRef<Audio.Recording>();

  const onHandlerStateChange = useCallback(
    (e: HandlerStateChangeEvent<LongPressGestureHandlerEventPayload>) => {
      if (e.nativeEvent.state === State.ACTIVE) {
        (async () => {
          try {
            const { granted, canAskAgain } = await Audio.getPermissionsAsync();
            let canStartRecord = granted;
            if (!granted && canAskAgain) {
              const audioPermission = await Audio.requestPermissionsAsync();
              canStartRecord = audioPermission.granted;
            }
            if (canStartRecord) {
              await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                allowsRecordingIOS: true,
                interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
                shouldDuckAndroid: true,
                interruptionModeAndroid:
                  Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
                playThroughEarpieceAndroid: false,
              });
              const result = await Audio.Recording.createAsync(
                Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY,
                onRecordingStatusUpdate,
                100
              );
              recorder.current = result.recording;
              onStartRecording();
            } else {
              // TODO: nice UI
              Alert.alert("You need to allow microphone");
            }
          } catch (err) {
            console.log(`error: ${JSON.stringify(err)}`);
          }
        })();
      }
      if (e.nativeEvent.state === State.END) {
        (async () => {
          recorder.current?.stopAndUnloadAsync();
          if (!cancelling.value && recorder.current) {
            const recordingURI = recorder.current?.getURI();
            onEndRecording({ isCancelled: false, uri: recordingURI });
          } else {
            onEndRecording({ isCancelled: true });
          }
        })();
      }
    },
    []
  );

  return (
    <View>
      <LongPressGestureHandler
        onGestureEvent={onLongPressGestureHandler}
        onHandlerStateChange={onHandlerStateChange}
        minDurationMs={300}
      >
        <Animated.View
          style={{
            width: ITEM_WIDTH,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome
            color={recordStatus?.isRecording ? "#fff" : "#6c6c6c"}
            name="microphone"
            size={24}
          />
        </Animated.View>
      </LongPressGestureHandler>
      <Animated.View
        style={[
          {
            backgroundColor: "#6c6c6c",
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
      <RecordingMeter recording={isRecording} recordingStatus={recordStatus} />
    </View>
  );
};

const RecordingMeter: React.FC<{
  recording: Animated.SharedValue<boolean>;
  recordingStatus: Audio.RecordingStatus | null;
}> = ({ recording, recordingStatus }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (
      recordingStatus?.isRecording &&
      recordingStatus.metering !== null &&
      recordingStatus.metering !== undefined
    ) {
      const { metering } = recordingStatus;
      const v = interpolate(metering, [-40, -10], [1, 3], Extrapolate.CLAMP);
      scale.value = withSpring(v);
    } else {
      scale.value = withSpring(1);
    }
  }, [recordingStatus?.metering]);

  const motion = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  }, []);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: "#ef4444",
          width: 50,
          height: 50,
          borderRadius: 25,
          alignItems: "center",
          justifyContent: "center",
          position: "absolute",
          right: 0,
          bottom: -14,
          transform: [{ translateX: recordingStatus?.isRecording ? 0 : 100 }],
        },
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: "#ef4444",
            opacity: 0.5,
          },
          motion,
        ]}
      />
      <View>
        <FontAwesome color="#fff" name="microphone" size={24} />
      </View>
    </Animated.View>
  );
};

export default AudioInputButton;

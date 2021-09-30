/* eslint-disable react-native/no-inline-styles */
import {FontAwesome} from '@expo/vector-icons';
import {Audio} from 'expo-av';
import React, {useCallback, useEffect, useState} from 'react';
import {Platform, TextInput, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import AudioInputButton, {
  RecordingResult,
} from '../components/AudioInputButton';
import {Text} from '../components/Themed';

const AudioInputScreen: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordStart, setRecordStart] = useState(0);
  const onStartRecording = useCallback(() => {
    setRecordStart(Date.now());
    setIsRecording(true);
  }, []);
  const onEndRecording = useCallback(({uri}: RecordingResult) => {
    setRecordStart(0);
    setIsRecording(false);

    if (uri) {
      (async () => {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
            interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
            shouldDuckAndroid: true,
            interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
            playThroughEarpieceAndroid: false,
          });
          await Audio.Sound.createAsync({uri}, {shouldPlay: true}, null, true);
        } catch (err) {
          console.log(`error: ${JSON.stringify(err)}`);
        }
      })();
    }
  }, []);

  return (
    <SafeAreaView style={{flex: 1}} edges={['bottom']}>
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <AudioInputButton {...{onStartRecording, onEndRecording}} />
      </View>
      <View
        style={{
          borderTopWidth: 1,
          borderColor: '#ddd',
          flexDirection: 'row',
          padding: 8,
          alignItems: 'center',
        }}>
        {isRecording && <RecordingIndicator start={recordStart} />}
        {!isRecording && (
          <>
            <FontAwesome
              name="photo"
              size={24}
              color="#6c6c6c"
              style={{marginHorizontal: 16}}
            />
            <TextInput
              style={{
                fontSize: 20,
                flex: 1,
                padding: 8,
                borderRadius: 8,
                backgroundColor: '#d9d9d9',
              }}
            />
          </>
        )}
        <AudioInputButton {...{onStartRecording, onEndRecording}} />
      </View>
    </SafeAreaView>
  );
};

function leadingZero(n: number) {
  if (n > 9) {
    return `${n}`;
  }

  return `0${n}`;
}

interface RecordingIndicatorProps {
  start: number;
}
const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({start}) => {
  const [duration, setDuration] = useState({min: 0, sec: 0, fraction: 0});
  useEffect(() => {
    const intr = setInterval(() => {
      const ms = Date.now() - start;
      const min = Math.floor(ms / 1000 / 60);
      let leftMs = ms - min * 1000 * 60;
      const sec = Math.floor(leftMs / 1000);
      leftMs = leftMs - sec * 1000;
      setDuration({min, sec, fraction: Math.floor(leftMs / 100)});
    }, 100);
    return () => clearInterval(intr);
  }, [start]);

  const redDotOpacity = useSharedValue(1);

  useEffect(() => {
    redDotOpacity.value = withRepeat(withTiming(0, {duration: 800}), -1, true);
  }, [redDotOpacity]);

  const redDotAni = useAnimatedStyle(() => {
    return {
      opacity: redDotOpacity.value,
    };
  }, []);

  const {min, sec, fraction} = duration;

  return (
    <View
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Animated.View
          style={[
            {
              width: 10,
              height: 10,
              borderRadius: 5,
              opacity: 1,
              backgroundColor: '#ef4444',
              marginHorizontal: 8,
            },
            redDotAni,
          ]}
        />
        <Text
          style={{
            fontFamily: Platform.select({
              ios: 'Helvetica Neue',
              default: 'monospace',
            }),
            padding: 8,
            fontSize: 20,
          }}>{`${leadingZero(min)}:${leadingZero(sec)}:${leadingZero(
          fraction,
        )}`}</Text>
      </View>
    </View>
  );
};

export default AudioInputScreen;

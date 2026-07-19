import React from 'react';
import {Composition} from 'remotion';
import {LinguaLensVideo} from './Video';
import {fps, totalSeconds} from './script';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LinguaLensDraft"
      component={LinguaLensVideo}
      durationInFrames={totalSeconds * fps}
      fps={fps}
      width={1920}
      height={1080}
    />
  );
};

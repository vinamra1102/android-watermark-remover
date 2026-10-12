import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import EditorScreen from './src/screens/EditorScreen';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  const [imageUri, setImageUri] = useState<string | null>(null);

  if (imageUri) {
    return (
      <GestureHandlerRootView style={rootStyle}>
        <EditorScreen imageUri={imageUri} onBack={() => setImageUri(null)} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={rootStyle}>
      <HomeScreen onImagePicked={setImageUri} />
    </GestureHandlerRootView>
  );
}

const rootStyle = { flex: 1 };

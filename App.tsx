import { StatusBar } from 'expo-status-bar';

import { ScannerScreen } from './src/features/scanner/ScannerScreen';

export default function App() {
  return (
    <>
      <StatusBar hidden />
      <ScannerScreen />
    </>
  );
}

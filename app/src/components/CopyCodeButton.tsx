import React, { useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { StyleProp, ViewStyle } from "react-native";
import { SketchyButton } from "@/components/SketchyButton";

interface CopyCodeButtonProps {
  code: string | null;
  style?: StyleProp<ViewStyle>;
}

export function CopyCodeButton({ code, style }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const copyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    setCopied(true);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SketchyButton
      title={copied ? "Copied!" : "Copy code"}
      variant={copied ? "primary" : "ghost"}
      onPress={copyCode}
      style={style}
    />
  );
}
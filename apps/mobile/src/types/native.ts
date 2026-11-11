import type { ComponentRef } from "react";
import type { ScrollView, TextInput, View } from "react-native";

// React Native 0.88 types these as function components, so refs need the instance type.
export type ViewHandle = ComponentRef<typeof View>;
export type ScrollViewHandle = ComponentRef<typeof ScrollView>;
export type TextInputHandle = ComponentRef<typeof TextInput>;

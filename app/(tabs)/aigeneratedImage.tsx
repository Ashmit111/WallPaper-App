import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { StatusBar } from "expo-status-bar";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const API_KEY = "AIzaSyCc4cCmkjnTmekPrnQBLudeyheUQlVyyPM";
const { width, height } = Dimensions.get("window");

const GenerateScreen: React.FC = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Request media library permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant media library permissions to save wallpapers"
        );
      }
    })();
  }, []);

  const saveToGallery = async () => {
    if (!imageUrl) return;
    
    try {
      setSaving(true);
      
      // Check media library permissions
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please enable media library access in settings");
        return;
      }

      // Extract base64 data from data URL
      const base64Data = imageUrl.split(",")[1];
      const mimeType = imageUrl.split(";")[0].split(":")[1];
      const fileExtension = mimeType === "image/jpeg" ? "jpg" : "png";

      // Create a unique filename
      const fileName = `wallpaper-${new Date().getTime()}.${fileExtension}`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Write the base64 data to file
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Verify file exists before saving to gallery
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error("Failed to create wallpaper file");
      }

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync("Wallpapers", asset, false);
      
      // Success alert
      Alert.alert(
        "Wallpaper Saved", 
        "Wallpaper has been saved to your gallery. You can set it as your background from your device's wallpaper settings.",
        [{ text: "OK" }]
      );

    } catch (error) {
      console.error("Error saving wallpaper:", error);
      Alert.alert("Error", "Failed to save wallpaper. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const generateImage = async (): Promise<void> => {
    if (!prompt.trim()) {
      Alert.alert("Error", "Please enter a prompt.");
      return;
    }

    setLoading(true);
    setImageUrl(null);
    setErrorMessage(null);

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
      });
      const enhancedPrompt = `High-quality smartphone wallpaper with aspect ratio 9:16, high resolution (1080x1920): ${prompt}. Make it visually striking and suitable for a phone lock screen.`;

      const chatSession = model.startChat({
        generationConfig: {
          temperature: 1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          responseModalities: ["image", "text"],
          responseMimeType: "text/plain",
        },
        history: [],
      });

      const result = await chatSession.sendMessage(enhancedPrompt);

      const candidates = result.response.candidates;
      let imageFound = false;

      if (candidates && candidates.length > 0) {
        for (let candidate of candidates) {
          if (candidate.content && candidate.content.parts) {
            for (let part of candidate.content.parts) {
              if (part.inlineData) {
                try {
                  const base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                  setImageUrl(base64Image);
                  imageFound = true;
                  break;
                } catch (err) {
                  console.error("Error processing image data:", err);
                }
              }
            }
          }
          if (imageFound) break;
        }
      }

      if (!imageFound) {
        throw new Error("No image was generated in the response");
      }
    } catch (error) {
      console.error("Image generation error:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to generate image";
      setErrorMessage(errorMsg);
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#1e3c72", "#2a5298"]} style={styles.gradient} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Wallpaper Creator</Text>
          <Text style={styles.subtitle}>
            Generate beautiful wallpapers for your phone
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            What kind of wallpaper do you want?
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Sunset over mountains, Abstract geometric pattern..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={prompt}
            onChangeText={setPrompt}
            editable={!loading}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[
              styles.generateButton,
              loading && styles.buttonDisabled
            ]}
            onPress={generateImage}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating Wallpaper..." : "Generate Wallpaper"}
            </Text>
            {!loading && (
              <Ionicons
                name="image-outline"
                size={20}
                color="white"
                style={styles.buttonIcon}
              />
            )}
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loaderText}>
              Crafting your perfect wallpaper...
            </Text>
            <Text style={styles.loaderSubtext}>
              This may take up to 30 seconds
            </Text>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color="#ff6b6b" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {imageUrl && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Your Wallpaper</Text>
            <Image
              source={{ uri: imageUrl }}
              style={styles.wallpaperImage}
              resizeMode="cover"
            />

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={saveToGallery}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons
                      name="download-outline"
                      size={20}
                      color="white"
                      style={styles.actionIcon}
                    />
                    <Text style={styles.actionText}>Save to Gallery</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.regenerateButton]}
                onPress={generateImage}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color="white"
                  style={styles.actionIcon}
                />
                <Text style={styles.actionText}>New Wallpaper</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212"
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: height
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  header: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center"
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    marginTop: 8,
    textAlign: "center"
  },
  inputContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24
  },
  inputLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 16,
    borderRadius: 12,
    color: "white",
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 20,
    minHeight: 120
  },
  generateButton: {
    backgroundColor: "#4169E1",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600"
  },
  buttonIcon: {
    marginLeft: 8
  },
  loaderContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 16,
    padding: 30,
    marginVertical: 20
  },
  loaderText: {
    color: "white",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600"
  },
  loaderSubtext: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
    fontSize: 14
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,0,0,0.1)",
    borderRadius: 12,
    padding: 16,
    marginVertical: 20
  },
  errorText: {
    color: "#ff6b6b",
    marginLeft: 8,
    fontSize: 15,
    flex: 1
  },
  resultContainer: {
    alignItems: "center",
    marginTop: 10
  },
  resultTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20
  },
  wallpaperImage: {
    width: "100%",
    height: height * 0.5,
    borderRadius: 12
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 30
  },
  actionButton: {
    backgroundColor: "#FF6347",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  regenerateButton: {
    backgroundColor: "#34a853"
  },
  actionIcon: {
    marginRight: 8
  },
  actionText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600"
  }
});

export default GenerateScreen;
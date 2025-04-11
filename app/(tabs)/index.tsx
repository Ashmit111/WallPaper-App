import React, { useEffect, useState } from "react";
import { 
  View, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  Dimensions, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  Text,
  Alert,
  StatusBar
} from "react-native";
import axios from "axios";
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get("window");

interface Wallpaper {
  id: number;
  src: {
    medium: string;
    large: string;
    portrait: string;
    original: string;
  };
  width: number;
  height: number;
}

export default function HomeScreen() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullScreenPreview, setFullScreenPreview] = useState(false);

  useEffect(() => {
    fetchWallpapers();
    requestMediaPermissions();
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
  }, []);

  const requestMediaPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant media library permissions to save wallpapers');
    }
  };

  const fetchWallpapers = async () => {
    try {
      setLoading(true);
      const randomPage = Math.floor(Math.random() * 50) + 1;
      const response = await axios.get<{ photos: Wallpaper[] }>(
        "https://api.pexels.com/v1/search",
        {
          params: { 
            query: "nature", 
            per_page: 20, 
            page: randomPage,
            orientation: "portrait", // Portrait orientation for 1080x1920
            size: "large"
          },
          headers: {
            Authorization: "ozhx1kVdu66Lerd1E63SGQ45ndc23ihzLJyWNZivf2voBcPHrpXoUAtj",
          },
        }
      );

      // Filter for images close to 1080x1920 aspect ratio (9:16)
      const filteredWallpapers = response.data.photos.filter(photo => 
        photo.height > photo.width && Math.abs((photo.height / photo.width) - (16/9)) < 0.3
      );
      
      setWallpapers(filteredWallpapers.length > 0 ? filteredWallpapers : response.data.photos);
    } catch (error) {
      console.error("Error fetching wallpapers:", error);
      Alert.alert("Error", "Failed to load wallpapers");
    } finally {
      setLoading(false);
    }
  };

  const handleWallpaperPress = (wallpaper: Wallpaper) => {
    setSelectedWallpaper(wallpaper);
    setModalVisible(true);
  };

  const toggleFullScreenPreview = () => {
    setFullScreenPreview(!fullScreenPreview);
  };

  const saveWallpaper = async () => {
    if (!selectedWallpaper) return;
    
    try {
      setSaving(true);
      // Use portrait format which is closest to 1080x1920
      const imageUrl = selectedWallpaper.src.portrait || selectedWallpaper.src.large;
      const fileUri = FileSystem.documentDirectory + `wallpaper-${selectedWallpaper.id}.jpg`;
      
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      
      if (downloadResult.status === 200) {
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync("Wallpapers", asset, false);
        Alert.alert(
          "Wallpaper Saved", 
          "Wallpaper has been saved to your gallery. You can set it as your background from your device's wallpaper settings.",
          [{ text: "OK", onPress: () => setModalVisible(false) }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save wallpaper. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderWallpaperItem = ({ item }: { item: Wallpaper }) => (
    <TouchableOpacity 
      style={styles.imageContainer} 
      onPress={() => handleWallpaperPress(item)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.src.portrait || item.src.large }}
        style={styles.image}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <LinearGradient 
        colors={["#1e3c72", "#2a5298"]} 
        style={styles.gradient} 
      />
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loaderText}>Loading wallpapers...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={wallpapers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderWallpaperItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            numColumns={2}
          />
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchWallpapers}
            disabled={loading}
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </>
      )}

      {/* Preview modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        {fullScreenPreview ? (
          <TouchableOpacity 
            style={styles.fullScreenContainer} 
            activeOpacity={1}
            onPress={toggleFullScreenPreview}
          >
            {selectedWallpaper && (
              <Image
                source={{ uri: selectedWallpaper.src.portrait || selectedWallpaper.src.large }}
                style={styles.fullScreenImage}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              {selectedWallpaper && (
                <>
                  <TouchableOpacity 
                    onPress={toggleFullScreenPreview}
                    activeOpacity={0.9}
                    style={styles.previewContainer}
                  >
                    <Image
                      source={{ uri: selectedWallpaper.src.portrait || selectedWallpaper.src.large }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                    <View style={styles.previewHint}>
                      <Ionicons name="expand-outline" size={24} color="white" />
                      <Text style={styles.previewHintText}>Tap for full screen</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <Text style={styles.modalTitle}>Wallpaper Options</Text>
                  
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, saving && styles.buttonDisabled]}
                      onPress={saveWallpaper}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <>
                          <Ionicons name="download-outline" size={20} color="white" style={styles.buttonIcon} />
                          <Text style={styles.buttonText}>Save to Gallery</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.cancelButton, saving && styles.buttonDisabled]}
                      onPress={() => setModalVisible(false)}
                      disabled={saving}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: height
  },
  listContent: {
    padding: 8,
    paddingTop: 12,
    paddingBottom: 80
  },
  imageContainer: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    height: 240,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loaderText: {
    color: "white",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600"
  },
  refreshButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#4169E1',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.85)'
  },
  modalView: {
    width: width * 0.9,
    height: height * 0.8,
    backgroundColor: "#1e1e1e",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
  },
  previewContainer: {
    width: '100%',
    height: '75%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  previewHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewHintText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginVertical: 16
  },
  buttonContainer: {
    width: '100%',
    gap: 12
  },
  button: {
    backgroundColor: "#FF6347",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600"
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#34a853",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#34a853",
    fontSize: 16,
    fontWeight: "600"
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  }
});
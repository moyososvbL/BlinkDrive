import { IWindow } from '../types';

declare const window: IWindow;

class EyeTrackingService {
  private initialized = false;
  private onGazeCallback: ((x: number, y: number) => void) | null = null;
  private isCalibrating = false;

  public async init() {
    if (this.initialized) return;

    if (window.webgazer) {
      try {
        // Clear any previous data to start fresh on load if needed, 
        // or keep it if we want persistence (we set saveDataAcrossSessions to true).
        
        await window.webgazer.setRegression('ridge')
          .setGazeListener((data: any, clock: any) => {
            if (data && this.onGazeCallback) {
              this.onGazeCallback(data.x, data.y);
            }
          })
          .saveDataAcrossSessions(true)
          .begin();

        // Hide default video element/canvas
        const videoContainer = document.getElementById('webgazerVideoContainer');
        if (videoContainer) videoContainer.style.display = 'none';
        
        const faceOverlay = document.getElementById('webgazerFaceOverlay');
        if (faceOverlay) faceOverlay.style.display = 'none';

        const feedbackBox = document.getElementById('webgazerFaceFeedbackBox');
        if (feedbackBox) feedbackBox.style.display = 'none';

        // Disable the default mouse click listener to prevent accidental 'training'
        // We only want to train during our specific calibration routine.
        window.webgazer.removeMouseEventListeners();

        this.initialized = true;
        console.log("WebGazer Initialized");
      } catch (e: any) {
        console.error("Failed to initialize WebGazer", e);
        if (e.message && e.message.includes('fetch')) {
            throw new Error("WebGazer failed to download model weights. If using as an extension, ensure manifest.json allows external connections.");
        }
        throw e;
      }
    } else {
      console.warn("WebGazer script not loaded");
      throw new Error("WebGazer script is missing or blocked. If you are running this as an Extension, ensure 'webgazer.cs.brown.edu' is allowed in manifest.json CSP.");
    }
  }

  public setGazeListener(callback: (x: number, y: number) => void) {
    this.onGazeCallback = callback;
  }

  public pause() {
    if (window.webgazer) {
      window.webgazer.pause();
    }
  }

  public resume() {
    if (window.webgazer) {
      window.webgazer.resume();
    }
  }

  // Used for calibration - we manually feed data points
  public recordCalibrationPoint(x: number, y: number) {
    if (window.webgazer) {
      // 'click' event type tells the model "this is a ground truth point"
      window.webgazer.recordScreenPosition(x, y, 'click');
    }
  }

  public clearCalibration() {
    if (window.webgazer) {
      window.webgazer.clearData();
      // Optional: Reset the model completely
      // window.webgazer.end();
      // this.initialized = false;
      // this.init();
      console.log("Calibration data cleared");
    }
  }

  public async checkCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Close immediately, just checking
      return true;
    } catch (err) {
      console.error("Camera permission denied", err);
      return false;
    }
  }
}

export const eyeTrackingService = new EyeTrackingService();
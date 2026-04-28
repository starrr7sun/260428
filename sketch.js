// Hand Pose Detection with ml5.js
// https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];
let statusMsg = "正在初始化..."; // 用於儲存目前的狀態訊息
let isModelLoaded = false;
let webglSupported = false;

// 檢查瀏覽器是否支援 WebGL
function checkWebGL() {
  try {
    let canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

function preload() {
  webglSupported = checkWebGL();
  if (!webglSupported) {
    statusMsg = "錯誤：此裝置不支援 WebGL，無法執行辨識。";
    return;
  }
  // 初始化模型，並加入回呼函數確認載入成功
  handPose = ml5.handPose({ flipped: true }, () => {
    isModelLoaded = true;
    statusMsg = "模型載入成功，等待攝影機...";
  });
}

function mousePressed() {
  console.log(hands);
}

function gotHands(results) {
  hands = results;
}

function setup() {
  // 產生全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  
  if (!webglSupported) return;

  video = createCapture(VIDEO);
  video.size(640, 480);
  // 必須加入 playsinline 屬性，iOS 才能在網頁內正常播放視訊
  video.elt.setAttribute('playsinline', '');
  video.hide();

  // 確保 iOS 視訊加載完成後才啟動手部偵測
  video.elt.onloadeddata = () => {
    statusMsg = "攝影機已就緒，開始偵測...";
    if (handPose) {
      handPose.detectStart(video, (results) => {
        statusMsg = "偵測運行中"; // 第一次偵測成功後更新狀態
        gotHands(results);
      });
    }
  };
}

// 當視窗大小改變時，自動調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // 設定背景顏色為 e7c6ff
  background('#e7c6ff');

  // 顯示目前的狀態訊息（方便在手機上偵錯）
  fill(0);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);
  text("系統狀態: " + statusMsg, 20, 20);
  if (!webglSupported || !video) return;

  // 計算顯示影像的寬高 (整個畫布的 60%)
  let w = width * 0.6;
  let h = height * 0.6;
  // 計算置中位置
  let x = (width - w) / 2;
  let y = (height - h) / 2;

  // 繪製水平翻轉後的影像，以符合 ml5 的 flipped: true 設定
  push();
  translate(x + w, y); 
  scale(-1, 1);
  image(video, 0, 0, w, h);
  pop();

  // Ensure at least one hand is detected
  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {
        // Loop through keypoints and draw circles
        for (let i = 0; i < hand.keypoints.length; i++) {
          let keypoint = hand.keypoints[i];

          // Color-code based on left or right hand
          if (hand.handedness == "Left") {
            fill(255, 0, 255);
          } else {
            fill(255, 255, 0);
          }

          // 根據影像縮放與偏移位置，重新計算關鍵點的座標
          // 使用 videoWidth 確保在手機轉向時能取得正確的比例
          let cx = map(keypoint.x, 0, video.elt.videoWidth || 640, x, x + w);
          let cy = map(keypoint.y, 0, video.elt.videoHeight || 480, y, y + h);

          noStroke();
          circle(cx, cy, 16);
        }
      }
    }
  }
}

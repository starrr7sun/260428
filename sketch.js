// Hand Pose Detection with ml5.js
// https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];
let statusMsg = "正在初始化..."; // 用於儲存目前的狀態訊息
let isModelLoaded = false;
let webglSupported = false;

// 預先定義手指結構，避免在 draw 迴圈中重複建立陣列提升效能
const FINGER_PARTS = [[0, 1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const PALM_BASE = [5, 9, 13, 17];

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
  // 初始化模型 (不在此翻轉座標，我們在畫布上統一翻轉)
  handPose = ml5.handPose({}, () => {
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
    if (handPose && isModelLoaded) {
      handPose.detectStart(video, (results) => {
        if (statusMsg !== "偵測運行中") {
          statusMsg = "偵測運行中"; 
        }
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

  // 確保 WebGL 支援且視訊已準備好數據，否則不進行後續運算防止卡死
  if (!webglSupported || !video || video.width === 0 || video.elt.readyState < 2) {
    return;
  }

  // 計算顯示影像的寬高 (整個畫布的 60%)
  let w = width * 0.6;
  let h = height * 0.6;
  // 計算置中位置
  let x = (width - w) / 2;
  let y = (height - h) / 2;

  // 繪製水平翻轉後的影像，以符合 ml5 的 flipped: true 設定
  push();
  translate(x + w, y); 
  scale(-1, 1); // 水平翻轉
  image(video, 0, 0, w, h);

  // 將點的繪製放在同一個翻轉座標系中，確保點永遠跟著影像走
  if (hands && hands.length > 0) {
    for (let hand of hands) {
      // 確保關鍵點數據存在且置信度足夠
      if (hand.confidence > 0.1 && hand.keypoints) {
        // 根據 handedness 設定線條顏色
        if (hand.handedness == "Left") {
          stroke(255, 0, 255);
        } else {
          stroke(255, 255, 0);
        }
        strokeWeight(4);

        // 1. 預先計算並儲存所有映射後的座標，確保線條與圓點使用完全相同的數據
        let mappedPoints = new Array(hand.keypoints.length);
        for (let i = 0; i < hand.keypoints.length; i++) {
          let kp = hand.keypoints[i];
          mappedPoints[i] = {
            x: map(kp.x, 0, video.width, 0, w),
            y: map(kp.y, 0, video.height, 0, h)
          };
        }

        // 2. 繪製手指連線 (使用預算的 mappedPoints)
        for (let part of FINGER_PARTS) {
          for (let i = 0; i < part.length - 1; i++) {
            let pt1 = mappedPoints[part[i]];
            let pt2 = mappedPoints[part[i + 1]];
            if (pt1 && pt2) line(pt1.x, pt1.y, pt2.x, pt2.y);
          }
        }

        // 3. 繪製掌心連線
        for (let target of PALM_BASE) {
          let pt1 = mappedPoints[0];
          let pt2 = mappedPoints[target];
          if (pt1 && pt2) line(pt1.x, pt1.y, pt2.x, pt2.y);
        }

        // 4. 繪製圓點 (使用相同的 mappedPoints)
        noStroke();
        for (let i = 0; i < mappedPoints.length; i++) {
          let pt = mappedPoints[i];
          if (hand.handedness == "Left") {
            fill(255, 0, 255);
          } else {
            fill(255, 255, 0);
          }
          circle(pt.x, pt.y, 16);
        }
      }
    }
  }
  pop(); // 結束翻轉座標系
}

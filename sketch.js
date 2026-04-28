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
  scale(-1, 1); // 水平翻轉
  image(video, 0, 0, w, h);

  // 將點的繪製放在同一個翻轉座標系中，確保點永遠跟著影像走
  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {
        // 根據 handedness 設定線條顏色
        if (hand.handedness == "Left") {
          stroke(255, 0, 255);
        } else {
          stroke(255, 255, 0);
        }
        strokeWeight(4);

        // 串接指定編號的關鍵點：0-4, 5-8, 9-12, 13-16, 17-20
        let fingerParts = [[0, 4], [5, 8], [9, 12], [13, 16], [17, 20]];
        for (let part of fingerParts) {
          for (let i = part[0]; i < part[1]; i++) {
            let pt1 = hand.keypoints[i];
            let pt2 = hand.keypoints[i + 1];
            line(map(pt1.x, 0, video.width, 0, w), map(pt1.y, 0, video.height, 0, h), 
                 map(pt2.x, 0, video.width, 0, w), map(pt2.y, 0, video.height, 0, h));
          }
        }

        for (let i = 0; i < hand.keypoints.length; i++) {
          let keypoint = hand.keypoints[i];

          if (hand.handedness == "Left") {
            fill(255, 0, 255);
          } else {
            fill(255, 255, 0);
          }

          // 在翻轉座標系中，直接對應 0~video.width 到 0~w
          let cx = map(keypoint.x, 0, video.width, 0, w);
          let cy = map(keypoint.y, 0, video.height, 0, h);

          noStroke();
          circle(cx, cy, 16);
        }
      }
    }
  }
  pop(); // 結束翻轉座標系
}

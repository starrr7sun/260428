// Hand Pose Detection with ml5.js
// https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];
let statusMsg = "正在初始化..."; // 用於儲存目前的狀態訊息
let isModelLoaded = false;
let webglSupported = false;

// 預先定義手指結構，確保連線精準
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
    statusMsg = "系統錯誤：此裝置不支援 WebGL，無法執行 AI 辨識。";
    return;
  }
  statusMsg = "正在從雲端載入 ml5 手部辨識模型...";
  // 初始化模型 (不在此翻轉座標，我們在畫布上統一翻轉)
  handPose = ml5.handPose({}, () => {
    isModelLoaded = true;
    statusMsg = "模型載入完成！正在初始化攝影機...";
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

  statusMsg = "正在請求攝影機權限...";
  video = createCapture(VIDEO);
  video.size(640, 480);
  // 必須加入 playsinline 屬性，iOS 才能在網頁內正常播放視訊
  video.elt.setAttribute('playsinline', '');
  video.hide();

  // 確保 iOS 視訊加載完成後才啟動手部偵測
  video.elt.onloadeddata = () => {
    statusMsg = "攝影機已連線，準備啟動偵測...";
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
  textSize(18);
  textAlign(LEFT, TOP);
  
  // 加入簡單的背景框讓文字更清楚
  fill(255, 200);
  rect(15, 15, textWidth("系統狀態: " + statusMsg) + 10, 30, 5);
  
  fill(0);
  text("系統狀態: " + statusMsg, 20, 20);

  // 效能與防錯檢查：確保 WebGL 支援且視訊已準備好數據
  if (!webglSupported || !video || video.width === 0 || video.elt.readyState < 2) {
    if (isModelLoaded && frameCount > 300 && statusMsg.includes("攝影機")) {
      statusMsg = "警告：攝影機載入過久，請確認是否允許權限。";
    }
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
      if (hand.confidence > 0.1 && hand.keypoints) {
        
        // 1. 預先計算並儲存所有映射後的座標，確保線條與圓點完全對齊
        let mappedPoints = [];
        for (let kp of hand.keypoints) {
          mappedPoints.push({
            x: map(kp.x, 0, video.width, 0, w),
            y: map(kp.y, 0, video.height, 0, h)
          });
        }

        // 設定顏色（左手桃紅、右手黃色）
        let c = hand.handedness === "Left" ? color(255, 0, 255) : color(255, 255, 0);

        // 2. 繪製骨架連線
        stroke(c);
        strokeWeight(4);
        noFill();

        // 繪製五指連線
        for (let part of FINGER_PARTS) {
          for (let i = 0; i < part.length - 1; i++) {
            let p1 = mappedPoints[part[i]];
            let p2 = mappedPoints[part[i + 1]];
            line(p1.x, p1.y, p2.x, p2.y);
          }
        }

        // 繪製手掌基部連線 (將手指根部連回手腕 0 號點)
        let wrist = mappedPoints[0];
        for (let b of PALM_BASE) {
          let pBase = mappedPoints[b];
          line(wrist.x, wrist.y, pBase.x, pBase.y);
        }

        // 3. 繪製關節圓點 (放在線條之後繪製，圓點才會在最上層)
        noStroke();
        fill(c);
        for (let pt of mappedPoints) {
          circle(pt.x, pt.y, 12);
        }
      }
    }
  }
  pop(); // 結束翻轉座標系
}

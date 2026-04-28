// Hand Pose Detection with ml5.js
// https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];

function preload() {
  // Initialize HandPose model with flipped video input
  handPose = ml5.handPose({ flipped: true });
}

function mousePressed() {
  console.log(hands);
}

function gotHands(results) {
  hands = results;
}

function setup() {
  createCanvas(640, 480);
  // 產生全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO, { flipped: true });
  video.hide();

  // Start detecting hands
  handPose.detectStart(video, gotHands);
}

// 當視窗大小改變時，自動調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  image(video, 0, 0);
  // 設定背景顏色為 e7c6ff
  background('#e7c6ff');

  // 計算顯示影像的寬高 (整個畫布的 60%)
  let w = width * 0.6;
  let h = height * 0.6;
  // 計算置中位置
  let x = (width - w) / 2;
  let y = (height - h) / 2;

  // 繪製影像到視窗中間
  image(video, x, y, w, h);

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
          let cx = map(keypoint.x, 0, video.width, x, x + w);
          let cy = map(keypoint.y, 0, video.height, y, y + h);

          noStroke();
          circle(keypoint.x, keypoint.y, 16);
          circle(cx, cy, 16);
        }
      }
    }
  }
}

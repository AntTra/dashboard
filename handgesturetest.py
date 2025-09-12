import cv2
import mediapipe as mp
import numpy as np
import pyautogui
import autopy
import time

class GestureRecognizer:
    def __init__(self, activeMode=False, maxHands=1, detectionConfidence=False, trackingConfidence=0.5):
        self.activeMode = activeMode
        self.maxHands = maxHands
        self.detectionConfidence = detectionConfidence
        self.trackingConfidence = trackingConfidence

        self.mediaPipeHands = mp.solutions.hands
        self.handProcessor = self.mediaPipeHands.Hands(self.activeMode, self.maxHands, self.detectionConfidence, self.trackingConfidence)
        self.mediaPipeDrawing = mp.solutions.drawing_utils
        self.fingerTipIndices = [4, 8, 12, 16, 20]

    def detectHands(self, frame, draw=True):
        frameRGB = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        self.processResults = self.handProcessor.process(frameRGB)

        if self.processResults.multi_hand_landmarks:
            for handLandmarks in self.processResults.multi_hand_landmarks:                                                                          
                if draw:
                    self.mediaPipeDrawing.draw_landmarks(frame, handLandmarks, self.mediaPipeHands.HAND_CONNECTIONS)
        return frame

    def getPositions(self, frame, handIndex=0, draw=True):   
        coordXList, coordYList, boundingBox, self.landmarkList  = [], [], [], []

        if self.processResults.multi_hand_landmarks:
            selectedHand = self.processResults.multi_hand_landmarks[handIndex]
            
            for idx, landmark in enumerate(selectedHand.landmark):
                height, width, _ = frame.shape
                coordX, coordY = int(landmark.x * width), int(landmark.y * height)
                coordXList.append(coordX)
                coordYList.append(coordY)
                self.landmarkList.append([idx, coordX, coordY])
                if draw:
                    cv2.circle(frame, (coordX, coordY), 5, (255, 0, 255), cv2.FILLED)

            xMin, xMax = min(coordXList), max(coordXList)
            yMin, yMax = min(coordYList), max(coordYList)
            boundingBox = xMin, yMin, xMax, yMax

            if draw:
                cv2.rectangle(frame, (xMin - 20, yMin - 20), (xMax + 20, yMax + 20),
                              (0, 255, 0), 2)

        return self.landmarkList, boundingBox

    def fingersRaised(self):
        fingers = []

        if self.landmarkList[self.fingerTipIndices[0]][1] > self.landmarkList[self.fingerTipIndices[0] - 1][1]:
            fingers.append(1)
        else:
            fingers.append(0)

        for i in range(1, 5):
            if self.landmarkList[self.fingerTipIndices[i]][2] < self.landmarkList[self.fingerTipIndices[i] - 2][2]:
                fingers.append(1)
            else:
                fingers.append(0)

        return fingers

def main():
    w = 640
    h = 480
    frameR = 100
    smooth = 8
    prev_x, prev_y = 0, 0
    curr_x, curr_y = 0, 0
    prev_time = 0
    stab_buf = []
    stab_thresh = 10
    stab_rad = 10
    scroll_down_speed = -60
    scroll_up_speed = 60

    cap = cv2.VideoCapture(0)
    cap.set(3, w)
    cap.set(4, h)
    cap.set(cv2.CAP_PROP_FPS, 60)

    detector = GestureRecognizer()               
    scr_w, scr_h = autopy.screen.size()
    
    control_enabled = True
    _ctrl_last_toggle = 0.0
    _ctrl_hold_started = None
    CTRL_TOGGLE_HOLD_S = 0.8
    CTRL_COOLDOWN_S = 1.0
    
    PINCH_RATIO = 0.25          # threshold = 25% of hand span
    PINCH_MIN_PX = 18           # absolute floor in pixels
    pinch_engaged = False       # latch so we click once per pinch
    pinch_last_click_time = 0.0
    PINCH_CLICK_COOLDOWN = 0.20 # seconds
    
    hold = False
    
    def is_middle(f):
            return len(f) >= 5 and f[0] == 0 and f[1] == 0 and f[2] == 1 and f[3] == 0 and f[4] == 0
    def is_shaka(f):
        return len(f) >= 5 and f[0] == 1 and f[1] == 0 and f[2] == 0 and f[3] == 0 and f[4] == 1
    tagFinger = True
    def pinch_state(lmList, ratio=0.25, min_px=18):
        # Uses thumb tip (4), index tip (8), and span between index MCP (5) and pinky MCP (17)
        thumb_tip = np.array(lmList[4][1:])
        index_tip = np.array(lmList[8][1:])
        hand_span = np.linalg.norm(np.array(lmList[5][1:]) - np.array(lmList[17][1:]))
        pinch_dist = np.linalg.norm(thumb_tip - index_tip)
        thresh = max(min_px, ratio * hand_span)
        return pinch_dist <= thresh, pinch_dist, thresh, thumb_tip, index_tip

    while True:
        ok, img = cap.read()
        if not ok:
            break

        img = detector.detectHands(img)
        lmList, _ = detector.getPositions(img)

        if len(lmList) != 0:
            # Landmarks: index fingertip (8)
            x1, y1 = lmList[8][1:]
            fingers = detector.fingersRaised()

            # Draw working frame
            cv2.rectangle(img, (frameR, frameR), (w - frameR, h - frameR), (255, 0, 255), 2)

            # --- Handle master toggle via gesture long-press ---
            now = time.time()
            if is_middle(fingers) and tagFinger == True:
                if _ctrl_hold_started is None:
                    _ctrl_hold_started = now
                elif (now - _ctrl_hold_started >= CTRL_TOGGLE_HOLD_S) and (now - _ctrl_last_toggle >= CTRL_COOLDOWN_S):
                    control_enabled = False
                    tagFinger = False
                    _ctrl_last_toggle = now
                    _ctrl_hold_started = None
                    # Safe release if disabled while holding
                    if not control_enabled and hold:
                        autopy.mouse.toggle(down=False)
                        hold = False
            elif is_shaka(fingers) and tagFinger == False:
                if _ctrl_hold_started is None:
                    _ctrl_hold_started = now
                elif (now - _ctrl_hold_started >= CTRL_TOGGLE_HOLD_S) and (now - _ctrl_last_toggle >= CTRL_COOLDOWN_S):
                    control_enabled = True
                    tagFinger = True
                    _ctrl_last_toggle = now
                    _ctrl_hold_started = None
                    # Safe release if disabled while holding
                    if not control_enabled and hold:
                        autopy.mouse.toggle(down=False)
                        hold = False
            else:
                _ctrl_hold_started = None
                
            is_pinch, pinch_dist, pinch_thresh, thumb_tip, index_tip = pinch_state(
                lmList, ratio=PINCH_RATIO, min_px=PINCH_MIN_PX
            )

            # Optional: draw a visual line + threshold info
            cv2.line(img, tuple(thumb_tip.astype(int)), tuple(index_tip.astype(int)), (0, 255, 255), 2)
            cv2.putText(img, f"pinch:{'1' if is_pinch else '0'} d={int(pinch_dist)}<= {int(pinch_thresh)}",
            (20, 140), cv2.FONT_HERSHEY_PLAIN, 1, (0, 255, 255), 1)
            
            # --- All gesture actions guarded by master control flag ---
            if control_enabled:
                # Move: index up, middle down
                if fingers[1] == 1 and fingers[2] == 0:
                    x3 = np.interp(x1, (frameR, w - frameR), (0, scr_w))
                    y3 = np.interp(y1, (frameR, h - frameR), (0, scr_h))

                    curr_x = prev_x + (x3 - prev_x) / smooth
                    curr_y = prev_y + (y3 - prev_y) / smooth

                    autopy.mouse.move(scr_w - curr_x, curr_y)  # horizontal flip
                    cv2.circle(img, (x1, y1), 7, (255, 0, 255), cv2.FILLED)
                    prev_x, prev_y = curr_x, curr_y

                    # update stabilization buffer
                    stab_buf.append((curr_x, curr_y))
                    if len(stab_buf) > stab_thresh:
                        stab_buf.pop(0)

                # Single left click (stabilized)
                if fingers[1] == 1 and fingers[4] == 1:
                    if len(stab_buf) == stab_thresh and all(
                        np.linalg.norm(np.array(pos) - np.array(stab_buf[0])) < stab_rad
                        for pos in stab_buf
                    ):
                        cv2.circle(img, (x1, y1), 15, (0, 255, 0), cv2.FILLED)
                        autopy.mouse.click()
                        stab_buf.clear()

                # Single right click (stabilized)
                if is_pinch and not pinch_engaged and (now - pinch_last_click_time) >= PINCH_CLICK_COOLDOWN:
                    autopy.mouse.click()                 # <- left click
                    pinch_engaged = True
                    pinch_last_click_time = now
                    # optional flash
                    cv2.circle(img, tuple(index_tip.astype(int)), 14, (0, 255, 0), cv2.FILLED)
                elif not is_pinch:
                    # reset latch once fingers separate
                    pinch_engaged = False

                # Hold left click and move (thumb down, others up)
                if fingers[0] == 0 and all(f == 1 for f in fingers[1:]):
                    if not hold:
                        autopy.mouse.toggle(down=True)
                        hold = True

                    x3 = np.interp(x1, (frameR, w - frameR), (0, scr_w))
                    y3 = np.interp(y1, (frameR, h - frameR), (0, scr_h))
                    curr_x = prev_x + (x3 - prev_x) / smooth
                    curr_y = prev_y + (y3 - prev_y) / smooth
                    autopy.mouse.move(scr_w - curr_x, curr_y)
                    cv2.circle(img, (x1, y1), 7, (255, 0, 255), cv2.FILLED)
                    prev_x, prev_y = curr_x, curr_y

                    # feed stabilization buffer while holding
                    stab_buf.append((curr_x, curr_y))
                    if len(stab_buf) > stab_thresh:
                        stab_buf.pop(0)
                else:
                    if hold:
                        autopy.mouse.toggle(down=False)
                        hold = False

                # Scroll down (all down)
                if all(f == 1 for f in fingers):
                    pyautogui.scroll(scroll_down_speed)

                # Scroll up (all up)
                if all(f == 0 for f in fingers):
                    pyautogui.scroll(scroll_up_speed)

            else:
                # When disabled, ensure we’re not holding the mouse button
                if hold:
                    autopy.mouse.toggle(down=False)
                    hold = False

        # --- FPS + HUD ---
        curr_time = time.time()
        fps = 1.0 / max(1e-6, (curr_time - prev_time))
        prev_time = curr_time

        cv2.putText(img, f"{int(fps)}", (20, 50), cv2.FONT_HERSHEY_PLAIN, 3, (0, 0, 0), 3)

        status = "ENABLED" if control_enabled else "DISABLED"
        color = (0, 200, 0) if control_enabled else (0, 0, 200)
        cv2.putText(img, f"Control: {status}", (20, 85), cv2.FONT_HERSHEY_PLAIN, 2, color, 2)

        # Progress bar while long-pressing the toggle gesture
        if _ctrl_hold_started is not None:
            progress = min(1.0, (time.time() - _ctrl_hold_started) / CTRL_TOGGLE_HOLD_S)
            cv2.rectangle(img, (20, 100), (220, 120), (80, 80, 80), 2)
            cv2.rectangle(img, (20, 100), (int(20 + 200 * progress), 120), (0, 255, 255), cv2.FILLED)

        cv2.imshow("Ironman proj", img)

        # Single waitKey site for quitting and keyboard toggle
        k = cv2.waitKey(1) & 0xFF
        if k == ord('g'):
            # Keyboard master toggle (debounced by 200ms)
            if (time.time() - _ctrl_last_toggle) >= 0.2:
                control_enabled = not control_enabled
                _ctrl_last_toggle = time.time()
                if not control_enabled and hold:
                    autopy.mouse.toggle(down=False)
                    hold = False
        if k == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
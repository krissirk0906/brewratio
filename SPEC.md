# SPEC: BrewRatio (`com.junenine.brewratio`)

## 1. Mục tiêu
Xây dựng bộ công cụ tính toán tỷ lệ pha cà phê thủ công chuẩn quốc tế (SCA Golden Cup) kết hợp bộ đếm thời gian rót nước (Pour Timer) có tín hiệu âm thanh (Web Audio API Synthesizer), hoạt động 100% tĩnh phía client (Static Astro SSG), không cookie, không backend.

## 2. Các Seam tính toán lõi (`src/lib/calc/`)

### A. Seam 1: Tỷ lệ Pha Cà Phê (`brewRatio.ts`)
- **Inputs:**
  - `method`: Phổ biến gồm `v60`, `french_press`, `aeropress`, `chemex`, `cold_brew`, `vietnamese_phin`, `espresso`, `custom`.
  - `mode`:
    - `by_coffee`: Người dùng nhập lượng cà phê khô (g) -> tính ra lượng nước cần rót (g/ml) và lượng nước cà phê thu được (yield).
    - `by_water`: Người dùng nhập lượng nước muốn dùng (g/ml) -> tính ra lượng cà phê khô cần cân (g) và yield.
    - `by_yield`: Người dùng nhập lượng cà phê thành phẩm muốn uống (ml/g) -> tính ra lượng cà phê và nước rót cần thiết (bù trừ lượng nước bị bã hấp thụ).
  - `ratio`: Tỷ lệ `1:X` (ví dụ `1:15`, `1:16`) hoặc lấy mặc định chuẩn theo `method`.
  - `strength`: `light` (nhạt/thanh), `balanced` (cân bằng), `strong` (đậm đà).

- **Outputs:**
  - `coffee_grams`: Khối lượng cà phê khô cần dùng (làm tròn 1 chữ số thập phân).
  - `water_grams`: Tổng lượng nước cần rót (g hoặc ml).
  - `ratio_string`: Ví dụ "1:15" hoặc "66.7 g/L".
  - `estimated_yield_ml`: Lượng cà phê thực tế chảy vào cốc (`water_grams - (coffee_grams * absorption_factor)`). Hệ số giữ nước của bã cà phê: thông thường `2.0 - 2.1g/g`.
  - `bloom_water_grams`: Lượng nước ủ nở ban đầu (2x - 3x lượng cà phê).
  - `bloom_time_seconds`: Thời gian ủ nở (30 - 45s).
  - `grind_recommendation`: Độ mịn hạt khuyến nghị theo phương pháp.
  - `target_brew_time`: Thời gian chiết xuất mục tiêu (ví dụ 3 phút 00 giây).

### B. Seam 2: Kế hoạch Rót Nước & Pulse Timer (`pulseTimer.ts`)
- **Phân đoạn rót:**
  - **Single Pour (Rót liên tục sau ủ)**: Bloom -> Pour duy nhất đến đủ nước -> Chờ chiết xuất.
  - **4:6 Method (Tetsu Kasuya)**: Chia làm 5 lần rót cách nhau 45s (40% đầu chỉnh độ ngọt/chua, 60% sau chỉnh nồng độ đậm nhạt).
  - **3-Stage Pulse Pour**: Bloom (20%) -> Pulse 1 (40%) -> Pulse 2 (40%).
- **Web Audio API Synth**:
  - Không tải file âm thanh ngoài để tránh lỗi mạng / bản quyền.
  - Tạo tiếng chuông "ding" ấm áp bằng Web Audio API `OscillatorNode` (tần số 880Hz / A5 kết hợp envelope gain decay mượt mà).

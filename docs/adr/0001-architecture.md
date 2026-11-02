# ADR 0001: Kiến Trúc Ứng Dụng BrewRatio

## Bối cảnh
Người yêu cà phê thủ công (V60, French Press, AeroPress, Chemex, Phin, Cold Brew) cần một công cụ tính toán chính xác lượng bột cà phê, lượng nước rót và kế hoạch rót (Pulse Pouring) kèm bộ đếm thời gian có chuông báo mà không cần cài đặt app phức tạp hay đăng ký tài khoản.

## Quyết định
1. **Kiến trúc tĩnh (Static SSG)**: Sử dụng Astro 5.x build ra HTML/CSS/JS tĩnh, deploy lên Cloudflare Pages (`https://brewratio.pages.dev`).
2. **Không Backend / Không Cookie**: 100% logic tính toán chạy phía client (Client-side TypeScript). Không thu thập PII, tuân thủ tuyệt đối GDPR / CCPA.
3. **Phân tách Seam logic (TDD & Deep Modules)**:
   - `src/lib/calc/types.ts`: Định nghĩa kiểu dữ liệu chặt chẽ cho phương pháp pha, độ đậm và kết quả chiết xuất.
   - `src/lib/calc/brewRatio.ts`: Module tính toán tỷ lệ, bù trừ độ ngậm nước của bã cà phê (`absorption_factor = 2.1g/g`).
   - `src/lib/calc/pulseTimer.ts`: Module tính toán các giai đoạn rót (Bloom, Pulse 1, Pulse 2 hoặc 4:6 Kasuya) kèm mốc thời gian.
4. **Web Audio API Synth**: Sử dụng `AudioContext` và sóng sine để phát chuông chime báo hiệu chuyển bước rót nước mà không phụ thuộc file MP3/WAV ngoài.
5. **Định danh Studio**: Package ID nội bộ `com.junenine.brewratio`, không hiển thị ra UI công khai.

## Trạng thái
Đã chấp thuận (Accepted).

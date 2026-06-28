# 🎓 HUIT Timetable App (Thời Khoá Biểu HUIT)

Một ứng dụng Desktop dành cho sinh viên trường Đại học Công Thương TP.HCM (HUIT) giúp theo dõi lịch học, lịch thi, kết quả học tập và thông tin cá nhân với giao diện trực quan và hiện đại.

## ✨ Tính năng nổi bật

- **Xem Thời Khoá Biểu:** Xem lịch học, lịch thi theo tuần với giao diện lưới gọn gàng. Hỗ trợ chuyển tuần linh hoạt và tra cứu ngày bằng lịch tiện dụng.
- **Tiến độ học tập:** Bảng điều khiển trực quan hiển thị số tín chỉ tích lũy và theo dõi tiến trình tốt nghiệp.
- **Kết quả học tập:** Biểu đồ điểm số tổng quan để nắm bắt nhanh tình hình học tập theo học kỳ.
- **Giao diện hiện đại (Dark Mode):** Ứng dụng hỗ trợ Dark/Light mode, tối ưu UX/UI mang lại trải nghiệm dùng thoải mái nhất.

## 🚀 Cài đặt & Chạy ứng dụng

Ứng dụng được xây dựng dựa trên [Electron](https://www.electronjs.org/). Để chạy ứng dụng trên máy của bạn, hãy làm theo các bước sau:

### Yêu cầu hệ thống
- Đã cài đặt [Node.js](https://nodejs.org/) (Khuyến nghị bản LTS).

### Cài đặt
1. Clone dự án về máy:
```bash
git clone https://github.com/VGKhiem/HUIT-App.git
cd HUIT-App
```

2. Cài đặt các thư viện cần thiết:
```bash
npm install
```

3. Khởi chạy ứng dụng:
```bash
npm start
```

## 🛠️ Công nghệ sử dụng
- **Electron.js:** Nền tảng xây dựng Desktop App đa hệ điều hành bằng công nghệ Web.
- **HTML, CSS, JavaScript (Vanilla):** Xử lý giao diện (UI) và logic (UX).
- **Flatpickr:** Tích hợp bộ chọn ngày hiện đại.
- **Chart.js:** Trực quan hoá dữ liệu (biểu đồ tiến độ, điểm số).

## 🤝 Đóng góp (Contributing)
Nếu bạn có ý tưởng tính năng mới hoặc phát hiện lỗi, hãy mở mục [Issues](https://github.com/VGKhiem/HUIT-App/issues) hoặc tạo một Pull Request trên kho lưu trữ này! 

---
*Lưu ý: Ứng dụng là công cụ tiện ích dành riêng cho sinh viên HUIT, đọc dữ liệu trực tiếp và an toàn từ cổng thông tin sinh viên bằng Webview.*

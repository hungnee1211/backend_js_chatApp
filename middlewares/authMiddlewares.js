import jwt from "jsonwebtoken";
import User from "../model/user.js";

const authMiddleware = async (req, res, next) => {
    try {
        // 1. Lấy token từ cookie thay vì header
        // Đảm bảo bạn đã dùng app.use(cookieParser()) ở file index.js
        const token = req.cookies.accessToken;

        // 2. Kiểm tra tồn tại của token
        if (!token) {
            return res.status(401).json({
                message: "Unauthorized: No token provided"
            });
        }

        // 3. Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.SECRET_TOKEN_KEY
        );

        // 4. Tìm user
        const user = await User.findById(decoded.userId).select("_id");

        if (!user) {
            return res.status(404).json({
                message: "User không tồn tại"
            });
        }

        // Gán user vào request để các route sau sử dụng
        req.user = user;
        next();

    } catch (error) {
        // Xử lý lỗi Token hết hạn hoặc không hợp lệ
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Unauthorized: Access Token expired"
            });
        }
        
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                message: "Unauthorized: Token invalid"
            });
        }

        console.error("Lỗi Middleware xác thực:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export default authMiddleware;
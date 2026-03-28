import jwt from "jsonwebtoken"
import User from "../model/user.js"

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken;

        // Nếu không có token, trả về 401 để Frontend biết đường mà Refresh
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }

        // jwt.verify sẽ quăng lỗi nếu token hết hạn (expired) hoặc sai (invalid)
        const decoded = jwt.verify(token, process.env.SECRET_TOKEN_KEY);

        const user = await User.findById(decoded.userId).select("_id");

        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }

        req.user = user;
        next();
    } catch (error) {
        // Nếu lỗi là do JWT hết hạn hoặc sai lệch
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Unauthorized: Token invalid or expired" });
        }

        // Các lỗi server khác mới để 500
        console.error("Lỗi Middleware xác thực:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export default authMiddleware;
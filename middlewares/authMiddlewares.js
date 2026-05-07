import jwt from "jsonwebtoken"
import User from "../model/user.js"

const authMiddleware = async (req, res, next) => {

    try {

        // Lấy Authorization header
        const authHeader =
            req.headers.authorization;

        // Kiểm tra tồn tại
        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                message:
                  "Unauthorized: No token provided"
            });
        }

        // Tách token
        const token =
            authHeader.split(" ")[1];

        // Verify JWT
        const decoded = jwt.verify(

            token,

            process.env.SECRET_TOKEN_KEY
        );

        // Tìm user
        const user = await User.findById(
            decoded.userId
        ).select("_id");

        if (!user) {

            return res.status(404).json({
                message: "User không tồn tại"
            });
        }

        req.user = user;

        next();

    } catch (error) {

        if (
            error.name === "TokenExpiredError" ||
            error.name === "JsonWebTokenError"
        ) {

            return res.status(401).json({
                message:
                  "Unauthorized: Token invalid or expired"
            });
        }

        console.error(
          "Lỗi Middleware xác thực:",
          error
        );

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}

export default authMiddleware;
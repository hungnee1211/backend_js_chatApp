// middlewares/authMiddleware.js

import jwt from "jsonwebtoken";
import User from "../model/user.js";

const authMiddleware = async (
  req,
  res,
  next
) => {

  try {

    // =========================
    // LẤY ACCESS TOKEN TỪ COOKIE
    // =========================

    const accessToken =
      req.cookies.accessToken;

    if (!accessToken) {

      return res.status(401).json({

        message:
          "Không có Access Token"
      });
    }

    // =========================
    // VERIFY TOKEN
    // =========================

    const decoded = jwt.verify(

      accessToken,

      process.env.SECRET_TOKEN_KEY
    );

    // =========================
    // CHECK USER
    // =========================

    const user = await User
      .findById(decoded.userId)
      .select("_id username");

    if (!user) {

      return res.status(404).json({

        message:
          "User không tồn tại"
      });
    }

    // =========================
    // GÁN USER VÀO REQUEST
    // =========================

    req.user = user;

    next();

  } catch (error) {

    // =========================
    // TOKEN HẾT HẠN / SAI
    // =========================

    if (

      error.name ===
      "TokenExpiredError"

    ) {

      return res.status(401).json({

        message:
          "Access Token hết hạn"
      });
    }

    if (

      error.name ===
      "JsonWebTokenError"

    ) {

      return res.status(401).json({

        message:
          "Access Token không hợp lệ"
      });
    }

    console.log(
      "Auth Middleware Error:",
      error
    );

    return res.status(500).json({

      message:
        "Lỗi server"
    });
  }
};

export default authMiddleware;
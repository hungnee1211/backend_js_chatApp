// dang ky
import bcrypt from 'bcrypt'
import User from '../model/user.js'
import jwt from "jsonwebtoken"


const SignUp = async (req, res) => {
    try {

        const { username, password, firstName, lastName } = req.body

        if (!username || !password || !firstName || !lastName) {
            return res.status(404).json({ message: "Khong the dien thieu thong tin" })
        }

        const exitUsername = await User.findOne({ username })
        if (exitUsername) {
            return res.status(401).json({ message: "Username da ton tai" })
        }

        const hashPassword = await bcrypt.hash(password, 10)

        const newUser = await User.create({
            username,
            password: hashPassword,
            displayName:`${firstName}  ${lastName}`
        })


        return res.status(200).json(newUser, -password)

    } catch (error) {
        res.status(401).json({ message: "username or password not correct" })
    }
}

//dang nhap

const SignIn = async (req, res) => {

    const ACCESS_TOKEN_TTL = 30 * 60 * 1000
    const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 14 * 1000 //14 ngay

    try {
        const { username, password } = req.body

        if (!username || !password) return res.status(400).json({ message: "Thieu username hoac password" })

        const user = await User.findOne({ username })

        if (!user) {
            return res.status(400).json({ message: "Khong tim thay user" })
        }
        const check = await bcrypt.compare(password, user.password)

        if (!check) return res.status(401).json({ message: "tai khoan hoa mat khau khong chinh xac" })

        //tao access token

        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.SECRET_TOKEN_KEY,
            { expiresIn: ACCESS_TOKEN_TTL }
        )


        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.REFRESH_TOKEN_KEY,
            { expiresIn: REFRESH_TOKEN_TTL }
        )

        //luu refresh token trong cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: REFRESH_TOKEN_TTL,
           

        })
        

         res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: ACCESS_TOKEN_TTL

        })
       
        return res.status(200).json({ message: "Dang nhap thanh cong", refreshToken })
    }
    catch (error) {
        return res.status(500).json({ message: "Lỗi server " })
    }
}


//dang xuat
const SignOut = async (req, res) => {
  try {
    res.clearCookie("accessToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/"
    })

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/"
    })

    return res.sendStatus(200)
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server khi đăng xuất" })
  }
}

export { SignIn, SignOut, SignUp }
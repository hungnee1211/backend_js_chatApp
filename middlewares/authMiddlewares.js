import jwt from "jsonwebtoken"
import User from "../model/user.js"

const authMiddleware = async (req , res , next) => {

    try {
        const authHeader = req.headers.authorization
    
        if(!authHeader || !authHeader.startsWith("Bearer "))
            return res.status(400).json({message:"Chua dang nhap"})

        const token = authHeader.split(" ")[1]

        const decoded = jwt.verify(token , process.env.SECRET_TOKEN_KEY)


        const user = await User.findById(decoded.userId).select("_id")

        if(!user)
            return res.status(404).json({message:"User k ton tai"})

        req.user = user

        next()
    } catch (error) {
        console.log("Looi middleware", error)
        return res.status(500).json({message:"loi middleware"})
    }
}

export default authMiddleware
import User from '../model/user.js'

const getUser = async (req , res) => {
    try {
       const users = await User.find().select('id username displayName')

       return res.status(200).json(users)
    } catch (error) {
        console.log("Loi fetch user" , error)
        return res.status(403).json({message:"Loi lay du lieu user"})
    }
}


const getUserDetail = async (req , res) => {
    try {
       const userId = req.user._id
       const users = await User.findById(userId).select('id username displayName')

       return res.status(200).json(users)
    } catch (error) {
        console.log("Loi fetch user" , error)
        return res.status(403).json({message:"Loi lay du lieu user"})
    }
}


export {getUser , getUserDetail}
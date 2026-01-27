import User from '../model/user.js'

const getUser = async (req , res) => {
    try {
       const users = await User.find().select('id username firstName lastName')

       return res.status(200).json(users)
    } catch (error) {
        console.log("Loi fetch user" , error)
        return res.status(403).json({message:"Loi lay du lieu user"})
    }
}

export default getUser
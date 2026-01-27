import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    
    username : {
        required : true ,
        type: String ,
        unique : true ,
        trim : true,
        lowercase : true ,
    } ,
    password : {
        required : true ,
        type : String 
    } ,
    firstName : {
        required : true ,
        type: String ,

    } ,
        lastName : {
        required : true ,
        type: String ,

    } ,
    avatarUrl:{
        type:String,
        default:""
    } 
} , 
{
    timestamps : true
})


export default mongoose.model("User" , userSchema)
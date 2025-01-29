import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { MongoClient, ObjectId } from "mongodb";
import jwt = require("jsonwebtoken");
import bcrypt = require("bcrypt");
import dotenv = require('dotenv');
import nodemailer = require("nodemailer");
import { JwtPayload } from 'jsonwebtoken';
import multer from "multer";
import path from "path";
import fs from 'fs';


dotenv.config();
const client = new MongoClient("mongodb://127.0.0.1:27017/");
const app = express();
const PORT = 8000;

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// MongoDB connection
const MongoConnect = async () => {
  await client.connect();
  console.log("Connected");
}

// New user registration 
const userRegistration = async (req: Request, res: Response, next: NextFunction) => {

  await MongoConnect();

  const { username, email, password, confirmPassword } = req.body;

  const db = client.db("MyDatabase");
  const userCollection = db.collection("users");

  if (!username || !email || !password || !confirmPassword) {
    return res.status(401).json({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(401).json({ message: "Passwords do not match" });
  }

  // Check if user exists
  const existsUsername = await userCollection.findOne({ username });
  const existsEmail = await userCollection.findOne({ email });
  if (existsUsername) {
    return res.status(402).json({ message: "Username already used" });
  }

  if (existsEmail) {
    return res.status(402).json({ message: "Email already used" });
  }

  // Password hashing
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = { username, email, password: hashedPassword, createdAt: new Date() };
  const result = await userCollection.insertOne(newUser);
  res.status(201).json({ message: "New user created successfully", userId: result.insertedId });

};

//  Login validation
const userLogin = async (req: Request, res: Response, next: NextFunction) => {

  await MongoConnect();

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).json({ message: "All fields are require" });
  }

  const db = client.db("MyDatabase");
  const userCollection = db.collection("users");

  const userExists = await userCollection.findOne({ email });

  if (!userExists) {
    return res.status(402).json({ message: "Invalid email and password" });
  }

  const isValidPassword = await bcrypt.compare(password, userExists.password);


  if (isValidPassword) {
    const token = await jwt.sign({ userId: userExists._id, email: userExists.email }, process.env.JWT_SECRET || "default_jwt_secret", { expiresIn: "15m" });
    return res.status(200).json({ message: "Login success", token });
  }
  res.status(500).json({ message: "User not found" });

};

// Send reset Password link to email address (after clicking on forgetPassword button)
const requestResetPassword = async (req: Request, res: Response, next: NextFunction) => {
  await MongoConnect();

  const { email } = req.body;

  const db = client.db("MyDatabase");
  const userCollection = db.collection("users");

  // Check if email exists
  const emailExists = await userCollection.findOne({ email });
  if (!emailExists) {
    return res.status(404).json({ message: "User not found" });
  }

  // Create token
  const token = jwt.sign({ userId: emailExists._id }, "your-secret-key", { expiresIn: '10m' });

  // Nodemailer setup
  const transporter = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 587,
    secure: false,
    auth: {
      user: "ff0e2f8726d0e3",
      pass: "f77c56c79be32b"
    }
  });


  // Create the reset password link
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'Password Reset Request',
    html: ` <p>Click on the following link to reset your password:</p>
               <a href="http://localhost:3000/resetPassword?token=${token}">Reset Password</a> `,
  };

  try {
    // Send email
    console.log("Sending email to:", email);
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Password reset email sent!" });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ message: "Error sending email" });
  }
};


// Reset Password Link
const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  await MongoConnect();

  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as JwtPayload;
    const userId = decoded.userId;


    const db = client.db("MyDatabase");
    const userCollection = db.collection("users");

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    const result = await userCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { password: hashedPassword } });
    console.log(result);

    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: "Password reset failed" });
    }

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

// Token verify for authorization
const tokenAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  await MongoConnect();
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized, Token not provided" });
  }

  const db = client.db("MyDatabase");

  const blackListedToken = db.collection("BlackListedtoken");

  const isBlackListedToken = await blackListedToken.findOne({ token });
  if (isBlackListedToken) {
    return res.status(405).json({ message: "Token is an black listed, Please login again" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret");
    (req as any).user = decoded
    next();
  } catch (err) {
    return res.status(402).json({ message: "Invalid token or expired" })
  }
};

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

// fileFilter to allow only image files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileTypes = /jpeg|jpg|png/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fileTypes.test(file.mimetype);
  console.log(file.mimetype);
  if (extname && mimetype) {
    cb(null, true)
  } else {
    cb(new Error("Only images are allowed"));
  }

};

// multer 
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Fetch user profile
const fetchUser = async (req: Request, res: Response, next: NextFunction) => {
  await MongoConnect();
  const userId = (req as any).user.userId;
  const db = client.db("MyDatabase");
  const userCollection = db.collection("users")

  try {
    const userFetch = await userCollection.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(userFetch);
    console.log(userFetch)
  } catch (err) {
    return res.status(405).json({ message: "Failed to fetch user" });
  }
};

// Update user profile
const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  await MongoConnect();
  const userId = (req as any).user.userId;
  const { name, username, phone } = req.body;
  const profilePhoto = req.file ? `/uploads/${req.file.filename}` : undefined;

  if (!name || !username || !phone) {
    return res.status(406).json({ message: "All fields required" });
  }
  const db = client.db("MyDatabase");
  const userCollection = db.collection("users");

  try {
    const usernameExists = await userCollection.findOne({ username, _id: { $ne: new ObjectId(userId) } });
    if (usernameExists) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const updatingUser = await userCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { name, username, phone, profilePhoto, updatedAt: new Date() } });

    if (updatingUser.modifiedCount === 0) {
      return res.status(403).json({ message: "Failed to update" });
    }

    res.status(200).json({ message: "Profile Updated Successfully", profilePhoto });

  } catch (err) {
    return res.status(500).json({ message: "Failed to update Profile" });
  }
};


// Logout user 
const userLogout = async (req: Request, res: Response, next: NextFunction) => {
  await MongoConnect();
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  console.log("Received token:", token);  // Debug log

  if (!token) {
    return res.status(400).json({ message: "Token not provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret") as JwtPayload;
    const expiry = decoded.exp;

    if (!expiry) {
      return res.status(401).json({ messsage: "Invalid token" });
    }

    const db = client.db("MyDatabase");
    const blackListedToken = db.collection("BlackListedtoken");

    const blackListToken = await blackListedToken.insertOne({ token, expiresAt: new Date(expiry * 1000) });
    res.status(200).json({ message: "Logged Out Successful" });
  } catch (err) {
    return res.status(500).json({ message: "Invalid or expired token" });
  }
};

// changing password by App
const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  await MongoConnect();
  const userId = (req as any).user.userId
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(401).json({ message: "All fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(402).json({ message: "Passwords must be matched" });
  }

  try {
    const db = client.db("MyDatabase");
    const userCollection = db.collection("users");

    const existedUser = await userCollection.findOne({ _id: new ObjectId(userId) });
    if (!existedUser) {
      return res.status(404).json({ message: "user not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, existedUser.password);
    if (!isMatch) {
      return res.status(405).json({ message: "Current password incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await userCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { password: hashedPassword, updatedAt: new Date() } });

    if (result.modifiedCount === 0) {
      return res.status(406).json({ message: "Failed to changed password" });
    }

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Something occurs error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Contact Us
const contactUs = async (req: Request, res: Response, next: NextFunction) => {
  await MongoConnect();
  const { name, email, mobileno, message, category } = req.body;

  if (!name || !email || !mobileno || !message || !category) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const db = client.db("MyDatabase");
    const userContact = db.collection("contactUs");

    const contactEntry = await userContact.insertOne({ name, email, mobileno, message, category, submitedAt: new Date() });
    res.status(200).json({ message: "Message submited successfully" });
  } catch (err) {
    console.log("Something wrong", err)
    return res.status(500).json({ message: "An occurs error, Please try again later" });
  }
};


// ContactUs data fetch Api
const contactUsData = async (req: Request, res: Response, next: NextFunction) => {
  await MongoConnect();
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not Allowed" });
  }

  try {
    const db = client.db("MyDatabase");
    const userContact = db.collection("contactUs");
    const datafetch = await userContact.find({}).toArray();
    res.status(200).json(datafetch);
  } catch (err) {
    console.error("Error to fetch data", err);
    return res.status(500).json({ message: "Internet server error" });
  }
};

// Delete profile photo from database
export const deleteProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
  await MongoConnect();

  const userId = (req as any).user.userId;

  try {
    const db = client.db("MyDatabase");
    const userCollection = db.collection("users");

    // Fetch the user
    const user = await userCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if profile photo exists
    const profilePhoto = user.profilePhoto;
    if (!profilePhoto) {
      return res.status(400).json({ message: "No profile photo to delete" });
    }

    // Build the photo path
    const photoPath = path.join(__dirname, "uploads", profilePhoto);

    // Delete the file if it exists
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }

    // Remove the profilePhoto field from the database
    await userCollection.updateOne({ _id: new ObjectId(userId) }, { $unset: { profilePhoto: "" } });

    return res.status(200).json({ message: "Profile photo deleted successfully" });
  } catch (error) {
    console.error("Error deleting profile photo:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


app.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  await userRegistration(req, res, next);
});

app.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  await userLogin(req, res, next);
});

app.post("/requestresetpassword", async (req: Request, res: Response, next: NextFunction) => {
  await requestResetPassword(req, res, next);
});

app.post("/resetpassword", async (req: Request, res: Response, next: NextFunction) => {
  await resetPassword(req, res, next);
});

app.get("/fetchuser", tokenAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  await fetchUser(req, res, next);
});

app.put("/updateuser", tokenAuthenticate, upload.single("profilePhoto"), async (req: Request, res: Response, next: NextFunction) => {
  await updateUser(req, res, next);
});

app.post("/logout", tokenAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  await userLogout(req, res, next);
});

app.post("/changepassword", tokenAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  await changePassword(req, res, next);
});

app.delete("/deleteprofilephoto", tokenAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  await deleteProfilePhoto(req, res, next);
});

app.post("/contact_us", async (req: Request, res: Response, next: NextFunction) => {
  await contactUs(req, res, next);
});

app.get("/fetch_contact_us", async (req: Request, res: Response, next: NextFunction) => {
  await contactUsData(req, res, next);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json("Something broke");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

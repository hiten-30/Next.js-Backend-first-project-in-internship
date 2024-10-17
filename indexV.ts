import express, {Request, Response} from "express";
const bodyParser = require('body-parser');
const cors = require('cors');
const data = require('./data.json');



// Write data to json file
// const fs = require('fs');
// fs.writeFileSync('./data.json', JSON.stringify(req.body))
console.log(data.users[0])
console.log(data.users[1])

const app = express();

const PORT = 8000;

// app.use(express.json());
app.use(bodyParser.json());
app.use(cors());


app.post('/login', (req: Request, res: Response) => {
    const username = req.body.username;
    const password = req.body.password;

   for (let i = 0; i <= data.users.length; i++) {
     if (username === data.users[i].username && password === data.users[i].password) {
            res.json({message: 'Login Success', username: username, password: password});
            break;
        } 
        
   }
      // console.log(`Am here at get request ${username} and ${password}`);
    // res.send('Hello ' + username+ ' and your password is '+password);
    // res.json({username, password});
});

   app.post('/register', (req: Request, res: Response) => {
    const { username, password } = req.body;


    // Check if the username already exists
    const userExists = data.users.some( username === username);

    if (userExists) {
        return res.status(400).json({ message: 'Username already taken' });
    }

    // Add the new user to the array
    data.users.push({ username, password });
    res.status(201).json({ message: 'Registration successful', username });
});
 


 

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})
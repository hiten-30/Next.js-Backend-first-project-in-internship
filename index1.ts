import express, {Request, Response} from "express";
const bodyParser = require('body-parser');
const cors = require('cors');
const data = require('./data.json');


const app = express();


const PORT = 8000;

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());



app.get('/', ( req: Request, res: Response) => {
const username = req.body.username;
const password = 'password';

     console.log(`Am here at get request ${username} and ${password}`);
    res.send('Hello ' + username+ ' and your password is '+password);
    // res.json({username, password});

});
    

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})

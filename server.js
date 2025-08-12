const express = require('express');
//const fetch = require('node-fetch');



const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    res.render('index');
});

app.get("/login", (req, res) => {
    res.render('login', { error: null });
});

app.get("/dashboard", (req, res) => {
    res.render('dashboard', { error: null });
});

app.listen('3000' ,(error)=>{
    if(error){
        console.log(error);
    }
    else{
        console.log("server running at http://localhost:3000");
    }
});
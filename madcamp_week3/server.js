const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 80;

app.use(bodyParser.json());
app.use(cors());

// MySQL 연결 설정
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'madcamp_week3'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

app.post('/checkUser', (req, res) => {
    const { login_method, token_id } = req.body;
    console.log(`${login_method}`);
    console.log(`${token_id}`);
    if (login_method === "KAKAO" || login_method === "NAVER" || login_method === "NONE") {
      const sql = 'SELECT COUNT(id) AS cnt FROM users WHERE login_method = ? AND login_token_id = ?';
      db.query(sql, [login_method, token_id], (err, results) => {
        if (err) {
          console.error('사용자 조회 오류: ', err);
          res.status(500).send('사용자 조회 오류');
          return;
        }
        console.log(`${login_method.toLowerCase()} find...`);
        if (results[0].cnt === 0) {
          res.status(300).send('사용자 정보 없음');
        } else {
          res.status(200).send('사용자 정보 있음');
        }
      });
    } else {
      res.status(400).send('잘못된 로그인 방법');
    }
  });

app.post('/registerUser', async (req, res) => {
    const { name, id, password, token_id, token_type } = req.body;
  
    const countSql = 'SELECT COUNT(id) AS userCount FROM users';
  
    try {
      const result = await new Promise((resolve, reject) => {
        db.query(countSql, (err, result) => {
          if (err) {
            return reject(err);
          }
          resolve(result);
        });
      });
  
      const userCount = result[0].userCount;
      const user_id = userCount + 1;
  
      console.log(`${name}`);
      console.log(`${id}`);
      console.log(`${password}`);
      console.log(`${user_id}`);
      console.log(`${token_id}`);
      console.log(`${token_type}`);
  
      const insertSql = 'INSERT INTO users (userName, following_user_id, following_user_pw, coin, login_method, login_token_id) VALUES (?, ?, ?, ?, ?, ?)';
      await new Promise((resolve, reject) => {
        db.query(insertSql, [name, id, password, 100, token_type, token_id], (err, result) => {
          if (err) {
            return reject(err);
          }
          resolve(result);
        });
      });
      console.log("database updated");
      res.status(200).send('DB update end')
    } catch (error) {
      console.error('Error executing:', error);
      res.status(500).send('Error executing');
    }
  });


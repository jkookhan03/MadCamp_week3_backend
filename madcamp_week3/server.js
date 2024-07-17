const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

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
  if (login_method === "KAKAO" || login_method === "NAVER") {
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

app.post('/checkUserNone', (req, res) => {
  const { token_id, password } = req.body;
  console.log(`${token_id}`);
  console.log(`${password}`);
  
  const sql = 'SELECT COUNT(id) AS cnt FROM users WHERE login_method = ? AND login_token_id = ? AND following_user_pw = ?';
  const params = ["NONE", token_id, password];

  db.query(sql, params, (err, results) => {
      if (err) {
          console.error('사용자 조회 오류: ', err);
          res.status(500).send('사용자 조회 오류');
          return;
      }
      console.log(`none method find...`);
      if (results[0].cnt === 0) {
          res.status(300).send('사용자 정보 없음');
      } else {
          res.status(200).send('사용자 정보 있음');
      }
  });
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

app.get('/getQuiz', (req, res) => {
  const sql = 'SELECT * FROM quiz ORDER BY RAND() LIMIT 1';

  db.query(sql, (err, results) => {
      if (err) {
          console.error('퀴즈 조회 오류: ', err);
          res.status(500).send('퀴즈 조회 오류');
          return;
      }
      if (results.length > 0) {
          res.status(200).json(results[0]);
      } else {
          res.status(300).send('퀴즈 정보 없음');
      }
  });
});

app.post('/getUserInfo', (req, res) => {
  const { token_id } = req.body;
  const sql = 'SELECT userName, coin FROM users WHERE login_token_id = ?';
  db.query(sql, [token_id], (err, results) => {
      if (err) {
          console.error('사용자 정보 조회 오류: ', err);
          res.status(500).send('사용자 정보 조회 오류');
          return;
      }
      if (results.length > 0) {
          res.status(200).json(results[0]);
      } else {
          res.status(300).send('사용자 정보 없음');
      }
  });
});

app.post('/updateUserCoins', (req, res) => {
  const { token_id, coins } = req.body;
  const sql = 'UPDATE users SET coin = coin + ? WHERE login_token_id = ?';
  db.query(sql, [coins, token_id], (err, results) => {
      if (err) {
          console.error('코인 업데이트 오류: ', err);
          res.status(500).send('코인 업데이트 오류');
          return;
      }
      res.status(200).send('코인 업데이트 성공');
  });
});

app.post('/getPurchasedItems', (req, res) => {
  const { token_id } = req.body;
  const sql = `
    SELECT pi.item_name 
    FROM purchased_items pi 
    JOIN users u ON pi.user_id = u.id 
    WHERE u.login_token_id = ?
  `;
  db.query(sql, [token_id], (err, results) => {
    if (err) {
      console.error('구매한 아이템 조회 오류: ', err);
      res.status(500).send('구매한 아이템 조회 오류');
      return;
    }
    res.status(200).json({ items: results.map(r => r.item_name) });
  });
});

app.post('/purchaseItem', (req, res) => {
  const { token_id, item_name, item_cost } = req.body;

  const getUserSql = 'SELECT id, coin FROM users WHERE login_token_id = ?';
  db.query(getUserSql, [token_id], (err, results) => {
    if (err) {
      console.error('사용자 조회 오류: ', err);
      res.status(500).send('사용자 조회 오류');
      return;
    }

    if (results.length === 0) {
      res.status(400).send('사용자 정보 없음');
      return;
    }

    const userId = results[0].id;
    const userCoins = results[0].coin;

    if (userCoins < item_cost) {
      res.status(400).send('코인이 부족합니다');
      return;
    }

    const purchaseSql = 'INSERT INTO purchased_items (user_id, item_name) VALUES (?, ?)';
    const updateCoinsSql = 'UPDATE users SET coin = coin - ? WHERE id = ?';

    db.beginTransaction(err => {
      if (err) {
        console.error('트랜잭션 오류: ', err);
        res.status(500).send('트랜잭션 오류');
        return;
      }

      db.query(purchaseSql, [userId, item_name], (err, results) => {
        if (err) {
          return db.rollback(() => {
            console.error('아이템 구매 오류: ', err);
            res.status(500).send('아이템 구매 오류');
          });
        }

        db.query(updateCoinsSql, [item_cost, userId], (err, results) => {
          if (err) {
            return db.rollback(() => {
              console.error('코인 업데이트 오류: ', err);
              res.status(500).send('코인 업데이트 오류');
            });
          }

          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error('커밋 오류: ', err);
                res.status(500).send('커밋 오류');
              });
            }

            res.status(200).send('아이템 구매 성공');
          });
        });
      });
    });
  });
});

app.post('/getUserCoins', (req, res) => {
  const { token_id } = req.body;
  const sql = 'SELECT coin FROM users WHERE login_token_id = ?';
  db.query(sql, [token_id], (err, results) => {
    if (err) {
      console.error('코인 조회 오류: ', err);
      res.status(500).send('코인 조회 오류');
      return;
    }
    if (results.length > 0) {
      res.status(200).json({ coins: results[0].coin });
    } else {
      res.status(300).send('사용자 정보 없음');
    }
  });
});

app.get('/daily_waste', (req, res) => {
  const userId = req.query.user_id;
  const query = 'SELECT date, amount FROM daily_waste WHERE user_id = ? ORDER BY date';
  
  db.query(query, [userId], (error, results) => {
    if (error) {
      return res.status(500).json({ error });
    }
    res.json(results);
  });
});

// userId를 가져오는 엔드포인트
app.post('/getUserId', (req, res) => {
  const token = req.body.token;
  console.log(`Received request to get userId with token: ${token}`); // 로그 추가

  const query = 'SELECT id FROM users WHERE login_token_id = ?';
  db.query(query, [token], (error, results) => {
    if (error) {
      console.error('Database query error:', error); // 로그 추가
      return res.status(500).json({ error: 'Database query failed' });
    }
    if (results.length > 0) {
      console.log(`Found userId: ${results[0].id}`); // 로그 추가
      return res.status(200).json({ userId: results[0].id });
    } else {
      console.log('User not found'); // 로그 추가
      return res.status(404).json({ error: 'User not found' });
    }
  });
});

// 사진 업로드 성공 후 daily_waste 업데이트 엔드포인트
app.post('/updateDailyWaste', (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).send('user_id is required');
  }

  // 오늘 날짜 구하기
  const today = new Date().toISOString().split('T')[0];

  // daily_waste 테이블에서 오늘 날짜와 user_id에 해당하는 레코드가 있는지 확인
  const checkQuery = 'SELECT * FROM daily_waste WHERE user_id = ? AND date = ?';
  db.query(checkQuery, [user_id, today], (err, results) => {
    if (err) {
      console.error('Error checking daily_waste:', err);
      return res.status(500).send('Error checking daily_waste');
    }

    if (results.length > 0) {
      // 기존 레코드가 있으면 amount를 1 증가
      const updateQuery = 'UPDATE daily_waste SET amount = amount + 1 WHERE user_id = ? AND date = ?';
      db.query(updateQuery, [user_id, today], (err, updateResults) => {
        if (err) {
          console.error('Error updating daily_waste:', err);
          return res.status(500).send('Error updating daily_waste');
        }
        res.status(200).send('daily_waste updated');
      });
    } else {
      // 기존 레코드가 없으면 새 레코드 삽입
      const insertQuery = 'INSERT INTO daily_waste (user_id, date, amount) VALUES (?, ?, 1)';
      db.query(insertQuery, [user_id, today], (err, insertResults) => {
        if (err) {
          console.error('Error inserting into daily_waste:', err);
          return res.status(500).send('Error inserting into daily_waste');
        }
        res.status(200).send('daily_waste record created');
      });
    }
  });
});
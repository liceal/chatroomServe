const ws = require('nodejs-websocket');

//用户池
const users = [
    { name: '刘一' },
    { name: '陈二' },
    { name: '张三' },
    { name: '李四' },
    { name: '王五' },
    { name: '赵六' },
    { name: '孙七' },
    { name: '周八' },
    { name: '吴九' },
    { name: '郑十' },
];
//链接数
var serverNumber = 0;
//空闲用户池
var idle = [...users.keys()];
//在线用户池
var online = [];


/**
 * listen 端口
 * node app.js 开启服务
 * connections 所有连接
 * code:{
 * -1发送msg
 * 200发送用户列表
 * 201发送用户信息
 * 202发送聊天信息
 * }
 */
const server = ws.createServer(
    conn => {
        //分配用户
        if (idle.length == 0) {
            let data = {
                code: -1,
                msg: "用户使用完了"
            }
            conn.userIndex = -1;
            console.log('用户使用完了')
            conn.sendText(JSON.stringify(data))
        } else {
            let userIndex = idle.pop()
            let userName = users[userIndex].name //上线用户
            conn.userIndex = userIndex //分配用户
            online.push(userIndex) //在线人数添加，空闲用户减少
            serverNumber = server.connections.length //初始化用户数
            console.log(`上线用户：${userName},当前连接数：${serverNumber}`);

            //广播在线用户池
            let onlineNames = user2name(online)
            let data = {
                code: 201,
                res: {
                    user: userName
                }
            }
            conn.sendText(JSON.stringify(data)) //发送登入人
            data = {
                code: 200,
                res: {
                    online: onlineNames
                }
            }
            broadcast(JSON.stringify(data)) //广播在线人
        }
        //接受消息监听
        conn.on('text', msg => {
            const value = `来自服务端的消息是：${msg}`
            console.log(value);

            let data = {
                code: 202,
                res: {
                    user: users[conn.userIndex].name,
                    time: dateTime(),
                    msg: msg
                }
            }
            broadcast(JSON.stringify(data))
        })

        //完成握手监听
        conn.on('connect', () => {
            conn.sendText(`完成握手`)
        })

        //关闭连接监听
        conn.on('close', (code, reason) => {
            quit(conn)
        })

        //异常拦截/处理监听
        conn.on('error', err => {
            // console.log(err);
            // quit(conn)
        })


    }
).listen(process.env.PORT || 666)

/**
 * 广播
 * 对所有连接者发送消息
 * @param {String} value 
 */
function broadcast(value) {
    server.connections.forEach(conn => {
        conn.sendText(value)
    });
}

/**
 * 退出当前账户
 */
function quit(conn) {
    if (conn.userIndex == -1) {
        console.log('空用户退出')
        return;
    }
    online.splice(online.indexOf(conn.userIndex), 1)
    idle.push(conn.userIndex)

    //广播在线用户
    let data = {
        code: 200,
        res: {
            online: user2name(online)
        }
    }
    broadcast(JSON.stringify(data))

    let userName = users[conn.userIndex].name
    console.log(`用户 ${userName} 退出了`);
}

/**
 * 下标数组转名字数组
 * @param {Array} values 
 */
function user2name(online) {
    let onlineNames = []
    online.forEach(index => {
        onlineNames.push(users[index].name)
    });
    return onlineNames
}

/**
 * 获取当前 小时:分钟:秒
 */
function dateTime() {
    var now = new Date();
    var hour = now.getHours() < 10 ? `0${now.getHours()}` : now.getHours(); //得到小时
    var minu = now.getMinutes() < 10 ? `0${now.getMinutes()}` : now.getMinutes(); //得到分钟
    var sec = now.getSeconds() < 10 ? `0${now.getSeconds()}` : now.getSeconds(); //得到秒
    return `${hour}:${minu}:${sec}`
}
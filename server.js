const k=require('express');
const server=k();
const path = require('path');
const bodyparser = require("body-parser");
const session = require("express-session");
//const router = k.Router();
const port=process.env.PORT||3000;
const { v4: uuidv4 } = require("uuid");
server.use((req, res, next) => {
    // Prevent caching for all requests
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  });
  const notifier = require('node-notifier');
// Function to display an alert message
function alert(message) {
  notifier.notify({
    title: 'Alert',
    message: message,
    sound: true, // Plays a sound with the notification
  });
}
  const mysql=require('mysql');
  const con=mysql.createConnection({host: "localhost",user: "root",password: "",database: "complaint_management"});
  con.connect((err)=>{if(err){alert("Error Occurred During MSQLcon");}});
  
  
  
  
  server.use(bodyparser.json());
  server.use(bodyparser.urlencoded({ extended: true }))
  server.set('view engine','ejs');
  
   server.use('/static', k.static(path.join(__dirname, 'public')))
   server.use('/assets', k.static(path.join(__dirname, 'public/assets')))
   server.use('/scripts',k.static(path.join(__dirname, 'scripts')));
   server.use(session({
    secret: uuidv4(), 
    resave: false,
    saveUninitialized: true
}));


server.get('/',(req,res)=>{
	res.render('login');
});

server.get('/login',(req,res)=>{
	res.render('login');
})

server.get('/signup',(req,res)=>{
	res.render('signup');
});

server.post('/login', (req, res)=>{
    try
    {
        const user=req.body.id,pswd=req.body.pswd;
        console.log(user,pswd);
        if(user=="admin@gmail.com")
        {
            if(pswd=="admin123")
            {req.session.user = user;
            req.session.role="admin";
            res.redirect('/admin');
            }
            else { alert('Incorrect password');}
        }
        else
        {
            con.query('select * from users where id=?',user,(error,results)=>{
            if(error){alert("Error Logging in..Enter Correct Details!!");}
            else if(results.length>0)
            {
                const u=results[0];
                console.log(u);
                if (u!=undefined && pswd===u.password) { 
                    req.session.user = u.username;
					req.session.user_id =u.id;
                    console.log("in login--> ",req.session.user_id );
                    req.session.role=u.role;
                    if(u.role=="management"){res.redirect('/management_dash');}
                    else{res.redirect('/dashboard');}
                }
                else 
                { alert('Incorrect password');}
            }
            else
            {             alert("we are sorry to inform you that.. you are not our user!!");}
    });}
    
    }
    catch(error)
    {
        alert("Try Again!!");
    }
  
});

//signup next action
server.post('/signup', (req, res)=>{
    try
    {
        const user=req.body.id,pswd=req.body.pswd,role=req.body.role,name=req.body.name;
        con.query('select * from  users where id=?',[user], async(error,results)=>{
            if(error)
            {alert("Error Logging in");}
            else if(results.length==0)
            {
                var k="insert into users(id,username,password,role) values ?";
                var values=[[user,name,pswd,role]];
                con.query(k,[values],(err,result)=>{
                    if(err){alert("Error while  inserting data to mysql...try again!!");}
                    
                        //console.log("Successful creation : ",user,pswd);
                    else{  
                        
                        // con.query('insert into users(name,password,role) values ?',[values],(error,results)=>
                        // {if(error){throw error;alert("Error in Storing new data..try again!!");}});
                        alert("Account is created...login with your credentials");
                        res.redirect('/login');
                }});
           }
            else
            {
                alert("we are glad to inform you that ...you are already an user!!");
                }

        });
    }
    catch(error)
    {
       alert('Error signing in..Try again!!');
    }
  
});

server.get('/logout', (req ,res)=>{
    req.session.destroy(function(err){
        if(err){ res.send("Error")
        }else{
            res.redirect('/login');
            
        }
    })
})

server.get('/dashboard',(req,res)=>{
    con.query('select count(*) as total from  complaints where id=?',[req.session.user_id], async(error,results)=>{
        if(error){alert('error while retrieving total complaints from database..');}
        else{
            const total=results[0].total;
            console.log(total);
            con.query('select count(*) as total from  complaints where id=? and status=?',[req.session.user_id,'0'], async(error,results)=>{
                if(error){alert('error while retrieving total complaints that are unresolved from database..');}
                else{
                    const total_unres=results[0].total;
                    const total_res=total-total_unres;
                    con.query('SELECT * FROM complaints where id=? ORDER BY curdate DESC LIMIT 5 ',[req.session.user_id], async(error,results)=>{
                        if(error){alert('error while retrieving latest complaints  from database..');}
                        else{
                            
                            res.render('dashboard',{user : req.session.user,role:req.session.role,id:req.session.user_id,total:total,total_unres:total_unres,total_res:total_res,results:results});
                        }
                    });
                    }
            });
        }
    });
    
});
server.get('/complaint',(req,res)=>{
    res.render('complaint',{user : req.session.user,role:req.session.role,id:req.session.user_id });
});

server.post('/complaint',(req,res)=>{
    // type_of_complaint,prblm,description,material,year,section,department
    const complaint=req.body.type_of_complaint;
    const prblm=req.body.prblm;
    const desc=req.body.description;
    const material=req.body.material;
    const user=req.session.user;
    const id=req.session.user_id ;
    const sql = `INSERT INTO complaints (username, id, type_of_complaint, prblm, description, material) VALUES ( ?, ?, ?, ?, ?, ?)`;
const values = [user, id, complaint, prblm, desc, material];

    con.query(sql,values,(err,result)=>{
        if(err){alert("Error while  inserting data to mysql...try again!!");}
        else{alert("We received Your Complaint... ");res.redirect('/dashboard');
}});
});


server.get('/status',(req,res)=>{
    res.render('status',{user : req.session.user,role:req.session.role,id:req.session.user_id });
});
server.get('/search', (req, response) => {

	const query = req.query.q;
	if(query != '')
	{
        if(query=='total')
        {
            con.query(`select * from complaints where id=?`,[req.session.user_id],async(error,results)=>{
                if(error){alert("while fetching data!!!");}
                response.send(results);
            });

        }
        else if(query=='unresolved')
        {
            con.query(`select * from complaints where id=? and status=?`,[req.session.user_id,'0'],async(error,results)=>{
                if(error){alert("while fetching data!!!");}
                response.send(results);
            });

        }
        else if(query=='resolved')
        {
            con.query(`select * from complaints where id=? and status=?`,[req.session.user_id,'1'],async(error,results)=>{
                if(error){alert("while fetching data!!!");}
                response.send(results);
            });

        }
    }
	else
	{
            con.query(`select * from complaints where id=?`,[req.session.user_id],async(error,results)=>{
                if(error){alert("while fetching data!!!");}
                response.send(results);
            });
	}

});

server.get('/history',(req,res)=>{
    res.render('history',{user : req.session.user,role:req.session.role,id:req.session.user_id });
});
server.get('/search1', (req, response) => {

	const query = req.query.q;
	if(query != '')
	{
        if(query=='electricity')
        {
            con.query(`select * from complaints where id=? and type_of_complaint=?`,[req.session.user_id,"electricity"],async(error,results)=>{
                if(error){alert("while fetching data!!!");}
                response.send(results);
            });

        }
        else if(query=='cleaning')
        {
            con.query(`select * from complaints where id=? and type_of_complaint=?`,[req.session.user_id,"cleaning"],async(error,results)=>{
                if(error){alert("while fetching data!!!");}
                response.send(results);
            });

        }
        else if(query=='plumber')
        {
            con.query(`select * from complaints where id=? and type_of_complaint=?`,[req.session.user_id,"plumber"],async(error,results)=>{
                if(error){alert("while fetching data!!!");}
                response.send(results);
            });

        }
        else if(query=='electronic')
        {
            con.query(`select * from complaints where id=? and type_of_complaint=?`,[req.session.user_id,"electronic"],async(error,results)=>{
                if(error){alert("while fetching data!!!");}
                response.send(results);
            });

        }
    }
	else
	{
            con.query(`select * from complaints where id=?`,[req.session.user_id],async(error,results)=>{
                if(error){alert("while fetching data!!!");}
                response.send(results);
            });
	}

});


server.get('/cr',(req,res)=>{
    res.render('cr');
});
server.get('/management',(req,res)=>{
    res.render('management');
});
server.get('/admin',(req,res)=>{
    res.render('admin');
})
// for managemnet
server.post('/action', function(request, response, next){
	
	var action = request.body.action;
    //console.log("action is executed...",action);
	if(action == 'fetch')
	{
		var query = "SELECT * FROM faculty where role='management'";
		con.query(query, function(error, data){
            if(error){console.log(error);alert("There is an error while fetching data from faculty Database");}
			response.json({

				data:data
			});

		});
	}

    if(action == 'Add')
	{
		var name = request.body.name;
		var dept = request.body.dept;
        var id=request.body.id;
		var role = "management";
        var pswd="12345";
		var query = `INSERT INTO faculty (name, department,role,id) VALUES ("${name}", "${dept}",  "${role}","${id}")`;
        // var q=`insert into users(name,role,password) values ("${name}","${role}","${pswd}")`
		
            con.query(query,(error,results)=>
            {
                if(error){console.log(error);alert("Error in Storing new data..try again!!");}
                con.query(`insert into users(id,username,role,password) values("${id}","${name}","${role}","manage")`,(error,results)=>
                {
                if(error){console.log(error);alert("Error in Storing new data in users database..try again!!");} 
                 response.json({message : 'Data Added'});    
            });   
            });	
    }
		if(action == 'fetch_single')
		{
			var id = request.body.sno;
		var query = `SELECT * FROM faculty WHERE sno = "${id}"`;
		con.query(query, function(error, data){
            if(error){alert("Error Occurred..while Fetching Data..!!!");}
			response.json(data[0]);
		});}
		if(action == 'Edit')
		{
            var sno=request.body.sno;
			 var id = request.body.id;
			var name = request.body.name;
			var dept = request.body.dept;
			var role = "management";
			// console.log(id," gfhj ");
			//  console.log("management ---> ",name,dept,id,sno);
            var q=`select id,name from faculty where sno ="${sno}"`;
			var query = `UPDATE faculty SET name = "${name}", department = "${dept}", id="${id}" WHERE sno ="${sno}"`;
            
			con.query(q, function(error, data){
				if(error){alert("Error Occurred..while retrieving   Exsisting Data from faculty database..!!!");}
                // console.log(data,"before updating");
                var result=data[0];
                var r_name=result.name;
                var r_id=result.id;
                var q1=`update users set username="${name}",id="${id}" where username="${r_name}" and id="${r_id}"`;
                console.log(name,id,r_name,r_id);
                con.query(query, function(error, data){
                    if(error){alert("Error Occurred..while  Editing Data at faculty database..!!!");}  
                    con.query(q1, function(error, data){
                        if(error){console.log(error);alert("Error Occurred..while updating  Exsisting Data from user database..!!!");}
                        response.json({
                            message : 'Data Edited'
                        });
                    });

                });
				
			});
		}
	
    if(action == 'delete')
	{
		var id = request.body.sno;
        var query = `DELETE FROM faculty WHERE sno = "${id}"`;
        con.query(`select id,name from faculty where sno="${id}"`, function(error, data){
            if(error){alert("Error Occurred..while retrieving Exsisting Data in user database..!!!");}
            var result=data[0];
            var r_name=result.name;
            var r_id=result.id;
            con.query(`delete from users where username="${r_name}" and id="${r_id}"`,function(error, data){
                if(error){alert("Error Occurred..while deleting Exsisting Data in user database..!!!");}
                con.query(query, function(error, data){
                    if(error){alert("Error Occurred..while Editing Exsisting Data..!!!");}
                    response.json({
                        message : 'Data Deleted'
                    });
        
                });
            });
           
        });
		
		
	}
});

// for students
server.post('/action1', function(request, response, next){

	var action = request.body.action;
    //console.log("action is executed...",action);
	if(action == 'fetch')
	{
		var query = "SELECT * FROM students";
		con.query(query, function(error, data){
            if(error){alert("There is an error while fetching data from Database");}
            //console.log(data);
			response.json({

				data:data
			});

		});
	}

    if(action == 'Add')
	{
		var name = request.body.name;
        var rno=request.body.rollno;
		var dept = request.body.dept;
		var year = request.body.year;
        var sec=request.body.sec;
		var role = "student";
		var query = `INSERT INTO students (name,rollno,year,department,section,role) VALUES ("${name}","${rno}","${year}", "${dept}", "${sec}", "${role}")`;
        var q=`select * from students where rollno="${rno}"`;
		con.query(q,(error,results)=>{
            if(error){console.log(error);alert("Error in Storing new data..try again!!");}
            else{
                con.query(query,(error,results)=>
                {if(error){console.log(error);alert("Error in Storing new data..try again!!");}
                    con.query(`insert into users(id,username,role,password) values("${rno}","${name}","${role}","12345")`,(error,results)=>
                    {
                    if(error){console.log(error);alert("Error in Storing new data in users database..try again!!");} 
                    response.json({message : 'Data Added'});
                    
                    });
                });
            }});    
    }
    if(action == 'fetch_single')
	{
		id = request.body.id;
		var query = `SELECT * FROM students WHERE id = "${id}"`;
		con.query(query, function(error, data){
            if(error){alert("Error Occurred..while Fetching Data..!!!");}
            console.log(data[0]);
			response.json(data[0]);
		});
	}
    if(action == 'Edit')
	{
        var id = request.body.id;
		var name = request.body.name;
        var rno=request.body.rollno;
		var dept = request.body.dept;
		var year = request.body.year;
        var sec=request.body.year;
		var role = "sf";
		var query = `UPDATE students SET name = "${name}", department = "${dept}", rollno="${rno}",year="${year}" ,section="${sec}"
        WHERE id ="${id}"`;
        con.query(`select rollno,name from students where id ="${id}"`, function(error, data){
            if(error){alert("Error Occurred..while retrieving   Exsisting Data from student database..!!!");}
            // console.log(data,"before updating");
            var result=data[0];
            var r_name=result.name;
            var r_id=result.rollno;
            con.query(query, function(error, data){
                if(error){alert("Error Occurred..while  Editing Data at student database..!!!");}  
                con.query(`update users set username=?,id=? where username="${r_name} and id="${r_id}""`,[name,rno], function(error, data){
                    if(error){console.log(error);alert("Error Occurred..while updating  Exsisting Data from user database..!!!");}
                    else{response.json({
                        message : 'Data Edited'
                    });}
                });

            });
            
        });
	}

    if(action == 'delete')
	{
		var id = request.body.id;
		var query = `DELETE FROM students WHERE id = "${id}"`;
        con.query(`select rollno,name from students where id="${id}"`, function(error, data){
            if(error){alert("Error Occurred..while retrieving Exsisting Data in user database..!!!");}
            var result=data[0];
            var r_name=result.name;
            var r_id=result.rollno;
            con.query(`delete from users where username="${r_name}" and id="${r_id}"`, function(error, data){
                if(error){alert("Error Occurred..while deleting Exsisting Data in user database..!!!");}
                con.query(query, function(error, data){
                    if(error){alert("Error Occurred..while Editing Exsisting Data..!!!");}
                    response.json({
                        message : 'Data Deleted'
                    });
        
                });
            });
           
        });
	}
});

server.get("/management_dash", (req, res) => {
  let sqlSolved = "SELECT COUNT(*) AS solved_count FROM complaints WHERE status = '1' ";
  let sqlUnsolved = "SELECT COUNT(*) AS unsolved_count FROM complaints WHERE status = '0'";
  let sqlall= "SELECT COUNT(*) AS all_count FROM complaints";
     con.query(sqlSolved, (err, solvedResult) => {
    if (err){console.log("err");alert("error occured while retrieving data from management database");} 

   con.query(sqlUnsolved, (err, unsolvedResult) => {
        if (err) {alert("error occured while retrieving data from management database");} 
 
       con.query(sqlall, (err, allResult) => {
          if (err) {alert("error occured while retrieving data from management database");} 
        // Extract counts from the results
        const solvedCount = solvedResult[0].solved_count;
        const unsolvedCount = unsolvedResult[0].unsolved_count;
        const allCount = allResult[0].all_count;
        res.render("management_dash",
        {solvedCount: solvedCount,unsolvedCount: unsolvedCount,allCount:allCount,
            user : req.session.user,role:req.session.role,id:req.session.user_id})
    
    });
  });
});

});

server.get('/graphData', (req, res) => {
    // Query to fetch data from the database
    // const query = `SELECT type_of_complaint, COUNT(*) AS All,  SUM(CASE WHEN status = 'solved' THEN 1 ELSE 0 END) AS Solved, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS Pending
    // FROM all_complaints GROUP BY type_of_complaint`;
    const query = `SELECT type_of_complaint, COUNT(*) AS total,SUM(CASE WHEN status = '1' THEN 1 ELSE 0 END) AS Solved, 
      SUM(CASE WHEN status = '0' THEN 1 ELSE 0 END) AS Pending FROM complaints GROUP BY type_of_complaint`;
  
  
    //const query = 'SELECT complaintType, allCount AS all, solvedCount AS solved, pendingCount AS pending FROM record';
    
    // Execute the query
    con.query(query, (error, results, fields) => {
      if (error) {
        // Handle error
        alert('Error fetching graph data:', error);
      }
      
      // Log the fetched data
    //   console.log('Graph data:', results);
      
      // Send the fetched data as JSON response
      res.json(results);
    });
  });
  server.get("/solved_complaints",(req,res)=>{
    let sql="select * from complaints where status='1'";
    let query=con.query(sql,(err,rows)=>{
        if(err) {alert(err);}
    else{
       res.render("solved_complaints",{
        title:"SOLVED COMPLAINTS ",
        solved_complaints :rows
    });}
  
    });
  });
server.get("/all_complaints",(req,res)=>{
    let sql="select * from complaints where status='0' ";
    let query=con.query(sql,(err,rows)=>{
        if(err)alert(err);
    res.render("complaint_index",{
        title:"COMPLAINTS TABLE",
        all_complaints :rows
    });

    });
});
server.post('/submit', (req, res) => {
    // const complaintId = req.params.id;
    const newStatus = req.body.status;
    const sno=req.body.sno;
    // console.log("in get submit method...",sno,newStatus);
    con.query('UPDATE complaints SET status = ? WHERE sno = ?', [newStatus, sno], (err, result) => {
      if (err) {
       alert('Error updating status:', err);
      }
      // Send a success response
      res.status(200).json({ message: 'Complaint has been updated successfully' });  
    });
  });
server.listen(port,()=>{console.log("server on http://localhost:3000")});






var Game = require('../lib/smile/game').Game;
var Student = require('../lib/smile/student').Student;
var js = require('../lib/js');
var fs = require('fs');

OK = 'OK';

HTTP_STATUS_OK = '200';

var MESSAGE_START_MAKE_QUESTION = {
    'TYPE' : 'START_MAKE'
};
var MESSAGE_WAIT_CONNECT = {
    'TYPE' : 'WAIT_CONNECT'
};

var game = new Game();

exports.handleQuestionGet = function(req, res) {
    var questions = game.questions.getQuestions(req.id);
    if (questions instanceof Error) {
        res.handleError(questions);
    } else {
        return res.sendJSON(HTTP_STATUS_OK, questions);
    }
};

function storeData(obj) {
    var json = JSON.stringify(obj);
    fs.writeFile(__dirname + "/../storage/" + new Date().toISOString(), json, function(err) {
        if (err) {
            console.log(err);
        } else {
            console.log("The file was saved!");
        }
    });
}

exports.handleStore = function(req, res) {
    storeData(req.body);
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleBackup = function(req, res) {
    storeData(game.messages.past);
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleImageUpload = function(req, res) {
    var file = req.file;
    var imageData = fs.readFileSync(file.path, 'binary');
    var base64data = new Buffer(imageData, 'binary').toString('base64');
    var data = {};
    data.success = "true";
    data.base64 = base64data;
    return res.sendJSON(HTTP_STATUS_OK, data);
};

exports.handleRatingMetadataPut = function(req, res) {
    game.setRatingMetadata(req.body);
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleRatingMetadataGet = function(req, res) {
    return res.sendJSON(HTTP_STATUS_OK, game.getRatingMetadata());
};

exports.handleQuestionGetAll = function(req, res) {
    return res.sendJSON(HTTP_STATUS_OK, game.questions.getAll());
};

exports.handleCurrentMessageGet = function(req, res) {
    return res.sendJSON(HTTP_STATUS_OK, game.getCurrentMessage());
};

exports.handleCurrentMessagePut = function(req, res) {
    game.setCurrentMessage(req.body);
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleSmileRootGet = function(req, res) {
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleStartMakeQuestionPut = function(req, res) {
    game.setCurrentMessage(MESSAGE_START_MAKE_QUESTION);
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleSendInitMessagePut = function(req, res) {
    game.setCurrentMessage(MESSAGE_WAIT_CONNECT);
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleStudentGetAll = function(req, res) {
    return res.sendJSON(HTTP_STATUS_OK, game.students.getAll());
};

exports.handleStudentResultsGet = function(req, res) {
    var studentStatus = game.studentsWrapper.getStudentStatus(req.id, game.questions.getNumberOfQuestions());
    var rightAnswers = game.questions.getRightAnswers();
    var myAnswers;
    var RIGHT = 1;
    var WRONG = 0;
    if (studentStatus instanceof Error) {
        res.handleError(studentStatus);
    } else {
        // Augment data with right answers
        studentStatus.RIGHT_ANSWERS = rightAnswers;
        studentStatus.ANSWER_SCORING = [];
        studentStatus.NUM_RIGHT = 0;
        studentStatus.SCORE_AS_PERCENTAGE = 0;
        if (studentStatus.SOLVED === "Y") {
            myAnswers = studentStatus.YOUR_ANSWERS;
            if (myAnswers) {
                // Be careful to only check scores against the total # answered
                for ( var i = 0; i < myAnswers.length; i++) {
                    if (rightAnswers[i] == myAnswers[i]) {
                        studentStatus.ANSWER_SCORING[i] = RIGHT;
                        studentStatus.NUM_RIGHT = studentStatus.NUM_RIGHT + 1;
                    } else {
                        studentStatus.ANSWER_SCORING[i] = WRONG;
                    }
                }

                // Make sure to escape the data
                studentStatus.SCORE_AS_PERCENTAGE = JSON.stringify(studentStatus.NUM_RIGHT / studentStatus.NUMQ);
                studentStatus.NUM_RIGHT = JSON.stringify(studentStatus.NUM_RIGHT);
            }
        }
        return res.sendJSON(HTTP_STATUS_OK, studentStatus);
    }
};

exports.handleStartSolveQuestionPut = function(req, res) {
    var timeLimit = 10; // The same time limit of old implementation.
    if (req.body.TIME_LIMIT) {
        timeLimit = req.body.TIME_LIMIT;
    }
    var numberOfQuestions = game.questions.getNumberOfQuestions();
    var rightAnswers = game.questions.getRightAnswers();
    var message = {};
    message.TYPE = 'START_SOLVE';
    message.NUMQ = numberOfQuestions;
    message.RANSWER = rightAnswers;
    message.TIME_LIMIT = timeLimit;

    game.setCurrentMessage(message);
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleStudentStatusGet = function(req, res) {
    var studentStatus = game.students.getStudentStatus(req.id);
    if (studentStatus instanceof Error) {
        res.handleError(studentStatus);
    } else {
        return res.sendJSON(HTTP_STATUS_OK, studentStatus);
    }
};

exports.handleStudentPut = function(req, res) {
    var message = req.body;
    var student = new Student(message.name, message.ip);
    game.students.addStudent(student);
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleResultsGet = function(req, res) {
    return res.sendJSON(HTTP_STATUS_OK, game.calculateResults());
};

exports.handleSendShowResultsPut = function(req, res) {
    var result = game.calculateResults();
    var message = {};
    message.TYPE = 'START_SHOW';
    message.WINSCORE = result.bestScoredStudentNames;
    message.WINRATING = result.bestRatedQuestionStudentNames;
    message.HIGHSCORE = result.winnerScore;
    message.HIGHRATING = result.winnerRating;
    message.NUMQ = result.numberOfQuestions;
    message.RANSWER = result.rightAnswers;
    message.AVG_RATINGS = result.averageRatings;
    message.RPERCENT = result.questionsCorrectPercentage;
    game.setCurrentMessage(message);
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleAllMessagesGet = function(req, res) {
    return res.sendJSON(HTTP_STATUS_OK, game.messages.past);
};

reset = function() {
    oldGame = game;
    game = new Game();
};

exports.handleResetGet = function(req, res) {
    reset();
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleResetPut = function(req, res) {
    reset();
    return res.sendText(HTTP_STATUS_OK, OK);
};

exports.handleCsvPushQuestions = function(req, res) {
    var rawQuestions = req.body;
    if (!rawQuestions) {
        error = new Error("No questions to parse.");
        return res.handleError(error);
    }
    rawQuestions.forEach(function(rawQuestion) {
        var question = {};
        question.NAME = "teacher";
        question.Q = rawQuestion.question;
        question.O1 = rawQuestion.choice1;
        question.O2 = rawQuestion.choice2;
        question.O3 = rawQuestion.choice3;
        question.O4 = rawQuestion.choice4;
        question.A = rawQuestion.answers.replace("choice", "");
        question.TYPE = rawQuestion.has_image === "true" ? "QUESTION_PIC" : "QUESTION";
        game.addQuestion(question);
    });
    return res.sendText(HTTP_STATUS_OK, OK);
};

//
// Backward compatibility
//

exports.handlePushMessage = function(req, res) {
    var message = req.body;
    game.registerMessage(message);
    var type = message.TYPE || null;
    if (type.indexOf("RE_TAKE") != -1) {
        type = 'RE_TAKE';
    }
    var error = null;
    switch (type) {
    case null:
        // Ignoring the message does not have a type
        console.warn("Unrecognized type: " + type);
        break;
    case 'RE_TAKE':
        game.setCurrentMessage(message);
        error = game.retake();
        break;
    case 'QUESTION':
        error = game.addQuestion(message);
        break;
    case 'QUESTION_PIC':
        error = game.addQuestion(message);
        break;
    case 'HAIL':
        error = game.studentsWrapper.addStudent(message);
        break;
    case 'ANSWER':
        error = game.registerAnswerByMessage(message);
        break;
    default:
        error = new Error("Unrecognized type: " + type);
        break;
    }
    if (error) {
        // Something wrong happened
        return res.handleError(error);
    } else {
        if (req.id) {
            var msg = "This server does not support question update. The question you sent has been added to: " + req.id;
            return res.sendText(HTTP_STATUS_OK, msg);
        } else {
            return res.sendText(HTTP_STATUS_OK, OK);
        }
    }
};

exports.handlePushMsgPost = function(req, res) {
    var message = req.body.MSG;
    try {
        req.body = JSON.parse(message);
        exports.handlePushMessage(req, res);
    } catch (e) {
        res.handleError("Can't parse Incoming JSON");
    }

};

exports.handleStudentStatusGetByIP = function(req, res) {
    var studentStatus = game.studentsWrapper.getStudentStatus(req.id, game.questions.getNumberOfQuestions());
    if (studentStatus instanceof Error) {
        res.handleError(studentStatus);
    } else {
        return res.sendJSON(HTTP_STATUS_OK, studentStatus);
    }
};

exports.handleMonitoringHtmlGet = function(req, res) {
    //    # of students
    //    Each student name + IP address
    //    Highlight in red self assigned IP, and duplicates
    //    # of questions submitted
    //    # of students who has answered questions
    var numberOfStudents = game.students.numberOfStudents;
    var students = game.students.currentStudents;
    var numberOfQuestions = game.questions.numberOfQuestions;
    var numberOfStudentsAnswered = 0;

    res.writeHead(200, {
        'Content-Type' : 'text/html; charset=utf-8',
    });
    res.write("<html>\n<head><title>SMILE Server Monitoring Tool</title></head>\n<body>\n");
    res.write("<p>Number of students: " + numberOfStudents + "</p>\n");
    res.write("<p>Number of questions: " + numberOfQuestions + "</p>\n");

    res.write("<table border=\"1\"><thead><th>Student Name</th><th>Student IP</th></thead><tbody>\n");
    var ipMap = {};
    for ( var k in students) {
        student = students[k];
        name = student.name;
        ip = student.ip;
        if (ipMap.hasOwnProperty(ip)) {
            ipMap[ip].push(name);
        } else {
            ipMap[ip] = [ name ];
        }
        if (student.getStatus().solved) {
            numberOfStudentsAnswered++;
        }
    }
    for ( var key in students) {
        var student = students[key];
        var name = student.name;
        var ip = student.ip;
        var color = ip.indexOf("169.254") != -1 || ipMap[ip].length > 1 ? "red" : "green";
        res.write("<tr><td>" + name + "</td><td style=\"color: " + color + "\">" + ip + "</td></tr>\n");
    }

    res.write("</tbody></table>\n");

    res.write("<p>Number of students who has answered questions: " + numberOfStudentsAnswered + "</p>\n");
    res.write("</body></html>\n");
    res.end();
};

exports.handleQuestionHtmlGet = function(req, res) {
    var questionNumber = parseInt(req.id, 10);
    var question = game.questions.getList()[questionNumber];
    if (!question) {
        return res.handleError(js.JumboError.notFound('Question not found: ' + questionNumber));
    }
    var studentName = question.NAME; // XXX
    res.writeHead(200, {
        'Content-Type' : 'text/html; charset=utf-8',
    });
    res.write("<html>\n<head>Question No." + (questionNumber + 1) + " </head>\n<body>\n");
    res.write("<p>(Question created by " + studentName + ")</p>\n");
    res.write("<P>Question:\n");
    res.write(question.Q);
    res.write("\n</P>\n");

    if (question.TYPE == "QUESTION_PIC") {
        res.write("<img class=\"main\" src=\"" + questionNumber + ".jpg\" width=\"200\" height=\"180\"/>\n");
    }

    res.write("<P>\n");
    res.write("(1) " + question.O1 + "<br>\n");
    res.write("(2) " + question.O2 + "<br>\n");
    res.write("(3) " + question.O3 + "<br>\n");
    res.write("(4) " + question.O4 + "<br>\n");
    res.write("</P>\n</body></html>\n");
    res.end();
};

exports.handleQuestionHtmlGet = function(req, res) {
    var questionNumber = parseInt(req.id, 10);
    var question = game.questions.getList()[questionNumber];
    if (!question) {
        return res.handleError(js.JumboError.notFound('Question not found: ' + questionNumber));
    }
    var studentName = question.NAME; // XXX
    res.writeHead(200, {
        'Content-Type' : 'text/html; charset=utf-8',
    });
    res.write("<html>\n<head>Question No." + (questionNumber + 1) + " </head>\n<body>\n");
    res.write("<p>(Question created by " + studentName + ")</p>\n");
    res.write("<P>Question:\n");
    res.write(question.Q);
    res.write("\n</P>\n");

    if (question.TYPE == "QUESTION_PIC") {
        res.write("<img class=\"main\" src=\"" + questionNumber + ".jpg\" width=\"200\" height=\"180\"/>\n");
    }

    res.write("<P>\n");
    res.write("(1) " + question.O1 + "<br>\n");
    res.write("(2) " + question.O2 + "<br>\n");
    res.write("(3) " + question.O3 + "<br>\n");
    res.write("(4) " + question.O4 + "<br>\n");
    res.write("</P>\n</body></html>\n");
    res.end();
};

exports.handleQuestionJSONGet = function(req, res) {
    var questionNumber = parseInt(req.id, 10);
    var question = game.questions.getList()[questionNumber];
    if (!question) {
        return res.handleError(js.JumboError.notFound('Question not found: ' + questionNumber));
    }

    res.sendJSON(HTTP_STATUS_OK, question);
};

exports.handleQuestionImageGet = function(req, res) {
    var questionNumber = parseInt(req.id, 10);
    var question = game.questions.getList()[questionNumber];
    if (!question) {
        return res.handleError(js.JumboError.notFound('Question not found: ' + questionNumber));
    }
    if (question.TYPE != "QUESTION_PIC") {
        return res.handleError(js.JumboError.notFound('Question does not have picture: ' + questionNumber));
    }
    var dataBuffer = new Buffer(game.questions.getQuestionPicture(questionNumber), 'base64');
    res.writeHead(200, {
        'Content-Type' : 'image/jpeg',
    });
    res.write(dataBuffer);
    res.end();
};

exports.handleQuestionResultHtmlGet = function(req, res) {
    var questionNumber = parseInt(req.id, 10);
    var question = game.questions.getList()[questionNumber];
    if (!question) {
        return res.handleError(js.JumboError.notFound('Question not found: ' + questionNumber));
    }
    var studentName = question.NAME; // XXX
    res.writeHead(200, {
        'Content-Type' : 'text/html; charset=utf-8',
    });
    res.write("<html>\n<head>Question No." + (questionNumber + 1) + " </head>\n<body>\n");
    res.write("<p>(Question created by " + studentName + ")</p>\n");
    res.write("<P>Question:\n");
    res.write(question.Q);
    res.write("\n</P>\n");

    if (question.TYPE == "QUESTION_PIC") {
        res.write("<img class=\"main\" src=\"" + questionNumber + ".jpg\" width=\"200\" height=\"180\"/>\n");
    }

    res.write("<P>\n");
    res.write("(1) " + question.O1 + (parseInt(question.A, 10) === 1 ? "<font color = red>&nbsp; &#10004;</font>" : "") + "<br>\n");
    res.write("(2) " + question.O2 + (parseInt(question.A, 10) === 2 ? "<font color = red>&nbsp; &#10004;</font>" : "") + "<br>\n");
    res.write("(3) " + question.O3 + (parseInt(question.A, 10) === 3 ? "<font color = red>&nbsp; &#10004;</font>" : "") + "<br>\n");
    res.write("(4) " + question.O4 + (parseInt(question.A, 10) === 4 ? "<font color = red>&nbsp; &#10004;</font>" : "") + "<br>\n");
    res.write("</P>\n");
    res.write("Correct Answer: " + question.A + "<br>\n");
    var numCorrectPeople = game.questionCorrectCountMap[questionNumber];
    res.write("<P> Num correct people: " + numCorrectPeople + " / " + game.students.getNumberOfStudents() + "<br>\n");
    res.write("Average rating: " + game.getQuestionAverageRating(questionNumber) + "<br>\n");

    res.write("</body></html>\n");

    res.end();
};

// Attribution: https://gist.github.com/1626318
exports.handleEchoClientIP = function(req, res) {

    var clientip = null;
    clientip = req.headers['x-forwarded-for'];
    if (clientip) {
        clientip.split(',');
        clientip = clientip[0];
    } else {
        clientip = req.connection.remoteAddress;
    }
    if (!clientip) {
        clientip = '127.0.0.1';
    }
    console.log('received ping from ' + clientip);
    return res.sendJSON(HTTP_STATUS_OK, {
        'ip' : clientip
    });
};

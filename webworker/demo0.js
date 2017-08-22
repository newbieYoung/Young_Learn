var i = 0;

function timedCount() {
    i = i + 1;
    postMessage(i); //通知主线程
    setTimeout(function() {
        timedCount();
    }, 500);
}
//监听主线程
onmessage = function(e) {
    if(e.data.name === 'tsm'){
        console.log('mom let\'s wait');
    }else{
        e.data.name = 'tsm';
        console.log(e.data.name+' let\'s go');
        timedCount();
    }
};

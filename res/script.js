const SZ = 8;
const NOA = 8;

var MTX = [];
var flag = [];
var pflag = [];
var anss = [], hints=[];
var accepted = [], unaccepted = [];
var input = "";
var lastR, lastC;
var total, found, hintcnt;

function initPuzzle(difficulty) {
    console.clear();
    anss = [],hints=[];
    for (let i = 0; i < NOA; i++) {
        if (difficulty == 'T')
            anss.push(bankT[Math.floor(Math.random() * bankT.length)]);
        else if(difficulty=='H')
            anss.push(bankH[Math.floor(Math.random() * bankH.length)]);

    }
    console.log(anss);
    document.getElementById("start-div").style.display = "none";
    document.getElementById("input-div").style.display = "block";
    document.getElementById("word-display").style.display = "block";
    lastR = lastC = -1;
    found = hintcnt=0;
    total = anss.length;
    document.getElementById("info-p").innerHTML = "Hidden words: " + NOA + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Found: " + found;

    MTX = []; flag = [];
    for (let i = 0; i < SZ; i++) {
        MTX[i] = [];
        flag[i] = [];
        pflag[i] = [];
        for (let j = 0; j < SZ; j++) {
            MTX[i][j] = null;
            flag[i][j] = 0;
            pflag[i][j] = 0;
        }
    }
    let tries = 0;
    for (let i = 0; i < anss.length; i++) {
        const element = anss[i];
        hints.push(-1,-1);
        while (!addToMtx(element)) {
            tries++;
            //console.log(tries);
            if (tries > 20) {
                initPuzzle(difficulty);
                return;
            }
        }

    }
    for (let i = 0; i < SZ; i++) {
        for (let j = 0; j < SZ; j++) {
            if (MTX[i][j] == null)
                MTX[i][j] = String.fromCharCode(65 + Math.random() * 26);
        }
    }
    console.log(hints);
    generateTable();
}

function addToMtx(word, x = -1, y = -1, i = 0) {
    if (x == -1 || y == -1) {
        let tries = 0;
        do {
            x = Math.floor(Math.random() * SZ);
            y = Math.floor(Math.random() * SZ);
            tries++;
            if (tries > 20) return 0;
        } while (MTX[x][y] != null)
        hints[hints.length-2]=x;
        hints[hints.length-1]=y;
    }
    MTX[x][y] = word.charAt(i);
    console.log(word + " " + x + " " + y + " " + i);
    var nx = x, ny = y;
    if (i == word.length - 1) {
        return 1;
    }
    var tries = 0;
    while (!(nx >= 0 && nx < SZ && ny >= 0 && ny < SZ && MTX[nx][ny] == null)) {
        nx = x + Math.floor(Math.random() * 3 - 1);
        ny = y + Math.floor(Math.random() * 3 - 1);

        tries++;
        if (tries > 100) return 0;
    }
    if (!addToMtx(word, nx, ny, i + 1)) {
        MTX[x][y] = null;
        return 0;
    }
    else return 1;
}

function buttonClick(row, col) {
    //alert(`Button clicked at Row: ${row}, Column: ${col}`);
    if (flag[row][col] != 0 || lastR != -1 && Math.abs(row - lastR) > 1 || lastC != -1 && Math.abs(col - lastC) > 1) return;
    lastR = row;
    lastC = col;
    flag[row][col] = 1;
    input += MTX[row][col];
    document.getElementById(row + "-" + col).style.backgroundColor = 'palegreen';
    document.getElementById("input1").value = input;
}

function clearSelection(pflg = 0) {
    lastR = lastC = -1;
    input = "";
    document.getElementById("input1").value = input;
    for (let i = 0; i < SZ; i++) {
        for (let j = 0; j < SZ; j++) {
            if (flag[i][j] != 0) {
                flag[i][j] = 0;
                if (pflg) pflag[i][j] = 1;
                if (pflag[i][j]) document.getElementById(i + "-" + j).style.backgroundColor = '#ddd';
                else document.getElementById(i + "-" + j).style.backgroundColor = '#eee';
            }
        }
    }
}

function submitWord() {
    var ans = document.getElementById("input1").value;
    if (ans.length<=3){
        alert(ans+" is too short")
        clearSelection();
        return;
    }
    var ansid = anss.indexOf(ans);
    if (ansid != -1) {
        if (accepted.indexOf(ans) == -1) {
            found++;
            accepted.push(ans);
            //alert("You have found " + found + "/" + total);
            document.getElementById("info-p").textContent = "Hidden words: " + NOA + "  Found: " + found;
            document.getElementById("found-words").textContent += "\n" + ans;
            document.getElementById("found-words").style.display="block";
        clearSelection(1);
            if (found == total) { alert("You have found all the words."); document.getElementById("info-p").textContent = "All " + NOA + " hidden words were found. You won!"; }
            return;
        }
        else alert("You have already found this word")
    }
    else if (bankALL.indexOf(ans)!=-1){
        if (unaccepted.indexOf(ans) == -1) {
            unaccepted.push(ans);
            hintcnt++;
        }
        alert(ans + " is not in the list");
        document.getElementById("unaccepted-words").textContent+="\n"+ans;
        document.getElementById("unaccepted-words").style.display="block";

    }
    else{
        alert(ans+" is not a word")
    }
    clearSelection();
}

function requestHint(){
    if(hintcnt<3){
        alert("find "+(3-hintcnt)+" more words to get hint!")
        return;
    }
    hintcnt-=3;
    for (let i = 0; i < anss.length; i++) {
        const wi = anss[i];
        if(accepted.indexOf(wi)==-1){
            document.getElementById(hints[i*2]+'-'+hints[i*2+1]).style.background='#fff316';
            break;
        }
    }
}

function generateTable() {
    const table = document.getElementById("buttonTable");
    for (let row = 0; row < SZ; row++) {
        const tableRow = document.createElement("tr");
        for (let col = 0; col < SZ; col++) {
            const tableData = document.createElement("td");
            const button = document.createElement("button");
            //button.innerText = `${row},${col}`;
            button.innerText = MTX[row][col];
            button.className = "button-table";
            button.id = row + "-" + col;
            button.onclick = () => buttonClick(row, col);
            tableData.appendChild(button);
            tableRow.appendChild(tableData);
        }
        table.appendChild(tableRow);
    }
}

//window.onload = generateTable;
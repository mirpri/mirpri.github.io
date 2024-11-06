with open("TOEFL.txt","r") as fr:
    fw=open("TOEFL.js","w")
    while True:
        s=fr.readline().replace("\n","")
        if not s:
            break
        fw.write("'"+s.upper()+"',")
    
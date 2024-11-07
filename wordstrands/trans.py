with open("allwords.txt","r") as fr:
    fw=open("output.txt","w")
    while True:
        s=fr.readline().replace("\n","")
        if not s:
            break
        if len(s)<=3 or not s.isalpha():
            continue
        fw.write("'"+s.upper()+"',")
    
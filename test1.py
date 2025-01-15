jsobj2 = dict()
jsobj2['type'] = "File"
jsobj2['name'] = "363-1"
jsobj2['id'] = '312'

jsobj3 = dict()
jsobj3['type'] = "File"
jsobj3['name'] = "363-2"
jsobj3['id'] = '313'


jsobj8 = dict()
jsobj8['type'] = "File"
jsobj8['name'] = "363-3"
jsobj8['id'] = '312'

jsobj9 = dict()
jsobj9['type'] = "File"
jsobj9['name'] = "363-4"
jsobj9['id'] = '313'


jsobj4 = dict()
jsobj4['type'] = "Folder"
jsobj4['name'] = "folder2"
jsobj4['id'] = '123124'
jsobj4['content'] = [jsobj8, jsobj9]


jsobj = dict()
jsobj['type'] = "Folder"
jsobj['name'] = "folder1"
jsobj['id'] = '123123'
jsobj['content'] = [jsobj2, jsobj3, jsobj4]


print(jsobj['content'])
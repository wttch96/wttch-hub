grammar packet;

// 顶层：若干个字段定义，直到文件结束
program
    : (definition)* EOF
    ;

// 嵌套块：{ ... }，块内继续是字段定义
block
    : '{' (definition)* '}'
    ;

definition
    : fieldDef block?
    ;

// 字段：可选的前缀渲染长度 + 位区间 + 可选的后缀渲染长度 + ":" + 字符串标签
// 例：16-31[+16]: "x"    [+8]16: "y"    16[Ver]: "z"
fieldDef
    : renderLen? rangeDef renderLen? ':' STRING
    ;

rangeDef
    : startPos | plusNumer | bitRange
    ;

// 单 bit 起点：16  或带角标标签 16[Ver]
startPos
    : NUMBER posLabel?
    ;

// +N 形式：起始位 = 上一同级字段结束位 + N（仅单起点，无结束位）
plusNumer
    : '+' NUMBER posLabel?
    ;

// 角标标签：[expr]，文本替换方框该端数字（不计算）
posLabel
    : '[' expr ']'
    ;

// 位区间：16-31，两端各自可带角标标签
bitRange
    : NUMBER posLabel? '-' NUMBER posLabel?
    ;

// 渲染长度：[+n]，从字段起始位起画 n bit（区别于 posLabel，因 [+ 无法作为 expr 起点）
renderLen
    : '[' '+' NUMBER ']'
    ;

// 算术表达式（仅作为 [expr] 角标文本的语法约束，不做求值）
expr
    : term ( (PLUS | MINUS) term )*
    ;

term
    : factor ( (STAR | SLASH) factor )*
    ;

factor
    : NUMBER
    | ID
    | LPAREN expr RPAREN
    ;

// ---------- 词法规则 ----------
NUMBER: [0-9]+;

PLUS   : '+' ;
MINUS  : '-' ;
STAR   : '*' ;
SLASH  : '/' ;
LPAREN : '(' ;
RPAREN : ')' ;

ID
    : [a-zA-Z_][a-zA-Z0-9_]* ;

// 字符串仅双引号、不跨行；不支持转义
STRING: '"' ( ~["\r\n] )* '"';

// %% 行注释
COMMENT: '%%' ~[\r\n]* -> skip;

NEWLINE: '\r'? '\n' -> skip;

WS: [ \t]+ -> skip;

/**
 * 文件说明：由 packet.g4 自动生成的 ANTLR 词法分析器，将协议文本切分为标记；修改语法应编辑源文件并重新生成。
 */

// @ts-nocheck

import * as antlr from "antlr4ng";
import { Token } from "antlr4ng";


export class packetLexer extends antlr.Lexer {
    public static readonly T__0 = 1;
    public static readonly T__1 = 2;
    public static readonly T__2 = 3;
    public static readonly T__3 = 4;
    public static readonly T__4 = 5;
    public static readonly NUMBER = 6;
    public static readonly PLUS = 7;
    public static readonly MINUS = 8;
    public static readonly STAR = 9;
    public static readonly SLASH = 10;
    public static readonly LPAREN = 11;
    public static readonly RPAREN = 12;
    public static readonly ID = 13;
    public static readonly STRING = 14;
    public static readonly COMMENT = 15;
    public static readonly NEWLINE = 16;
    public static readonly WS = 17;

    public static readonly channelNames = [
        "DEFAULT_TOKEN_CHANNEL", "HIDDEN"
    ];

    public static readonly literalNames = [
        null, "'{'", "'}'", "':'", "'['", "']'", null, "'+'", "'-'", "'*'", 
        "'/'", "'('", "')'"
    ];

    public static readonly symbolicNames = [
        null, null, null, null, null, null, "NUMBER", "PLUS", "MINUS", "STAR", 
        "SLASH", "LPAREN", "RPAREN", "ID", "STRING", "COMMENT", "NEWLINE", 
        "WS"
    ];

    public static readonly modeNames = [
        "DEFAULT_MODE",
    ];

    public static readonly ruleNames = [
        "T__0", "T__1", "T__2", "T__3", "T__4", "NUMBER", "PLUS", "MINUS", 
        "STAR", "SLASH", "LPAREN", "RPAREN", "ID", "STRING", "COMMENT", 
        "NEWLINE", "WS",
    ];


    public constructor(input: antlr.CharStream) {
        super(input);
        this.interpreter = new antlr.LexerATNSimulator(this, packetLexer._ATN, packetLexer.decisionsToDFA, new antlr.PredictionContextCache());
    }

    public get grammarFileName(): string { return "packet.g4"; }

    public get literalNames(): (string | null)[] { return packetLexer.literalNames; }
    public get symbolicNames(): (string | null)[] { return packetLexer.symbolicNames; }
    public get ruleNames(): string[] { return packetLexer.ruleNames; }

    public get serializedATN(): number[] { return packetLexer._serializedATN; }

    public get channelNames(): string[] { return packetLexer.channelNames; }

    public get modeNames(): string[] { return packetLexer.modeNames; }

    public static readonly _serializedATN: number[] = [
        4,0,17,103,6,-1,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,
        2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,2,
        13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,1,0,1,0,1,1,1,1,1,2,1,2,1,
        3,1,3,1,4,1,4,1,5,4,5,47,8,5,11,5,12,5,48,1,6,1,6,1,7,1,7,1,8,1,
        8,1,9,1,9,1,10,1,10,1,11,1,11,1,12,1,12,5,12,65,8,12,10,12,12,12,
        68,9,12,1,13,1,13,5,13,72,8,13,10,13,12,13,75,9,13,1,13,1,13,1,14,
        1,14,1,14,1,14,5,14,83,8,14,10,14,12,14,86,9,14,1,14,1,14,1,15,3,
        15,91,8,15,1,15,1,15,1,15,1,15,1,16,4,16,98,8,16,11,16,12,16,99,
        1,16,1,16,0,0,17,1,1,3,2,5,3,7,4,9,5,11,6,13,7,15,8,17,9,19,10,21,
        11,23,12,25,13,27,14,29,15,31,16,33,17,1,0,6,1,0,48,57,3,0,65,90,
        95,95,97,122,4,0,48,57,65,90,95,95,97,122,3,0,10,10,13,13,34,34,
        2,0,10,10,13,13,2,0,9,9,32,32,108,0,1,1,0,0,0,0,3,1,0,0,0,0,5,1,
        0,0,0,0,7,1,0,0,0,0,9,1,0,0,0,0,11,1,0,0,0,0,13,1,0,0,0,0,15,1,0,
        0,0,0,17,1,0,0,0,0,19,1,0,0,0,0,21,1,0,0,0,0,23,1,0,0,0,0,25,1,0,
        0,0,0,27,1,0,0,0,0,29,1,0,0,0,0,31,1,0,0,0,0,33,1,0,0,0,1,35,1,0,
        0,0,3,37,1,0,0,0,5,39,1,0,0,0,7,41,1,0,0,0,9,43,1,0,0,0,11,46,1,
        0,0,0,13,50,1,0,0,0,15,52,1,0,0,0,17,54,1,0,0,0,19,56,1,0,0,0,21,
        58,1,0,0,0,23,60,1,0,0,0,25,62,1,0,0,0,27,69,1,0,0,0,29,78,1,0,0,
        0,31,90,1,0,0,0,33,97,1,0,0,0,35,36,5,123,0,0,36,2,1,0,0,0,37,38,
        5,125,0,0,38,4,1,0,0,0,39,40,5,58,0,0,40,6,1,0,0,0,41,42,5,91,0,
        0,42,8,1,0,0,0,43,44,5,93,0,0,44,10,1,0,0,0,45,47,7,0,0,0,46,45,
        1,0,0,0,47,48,1,0,0,0,48,46,1,0,0,0,48,49,1,0,0,0,49,12,1,0,0,0,
        50,51,5,43,0,0,51,14,1,0,0,0,52,53,5,45,0,0,53,16,1,0,0,0,54,55,
        5,42,0,0,55,18,1,0,0,0,56,57,5,47,0,0,57,20,1,0,0,0,58,59,5,40,0,
        0,59,22,1,0,0,0,60,61,5,41,0,0,61,24,1,0,0,0,62,66,7,1,0,0,63,65,
        7,2,0,0,64,63,1,0,0,0,65,68,1,0,0,0,66,64,1,0,0,0,66,67,1,0,0,0,
        67,26,1,0,0,0,68,66,1,0,0,0,69,73,5,34,0,0,70,72,8,3,0,0,71,70,1,
        0,0,0,72,75,1,0,0,0,73,71,1,0,0,0,73,74,1,0,0,0,74,76,1,0,0,0,75,
        73,1,0,0,0,76,77,5,34,0,0,77,28,1,0,0,0,78,79,5,37,0,0,79,80,5,37,
        0,0,80,84,1,0,0,0,81,83,8,4,0,0,82,81,1,0,0,0,83,86,1,0,0,0,84,82,
        1,0,0,0,84,85,1,0,0,0,85,87,1,0,0,0,86,84,1,0,0,0,87,88,6,14,0,0,
        88,30,1,0,0,0,89,91,5,13,0,0,90,89,1,0,0,0,90,91,1,0,0,0,91,92,1,
        0,0,0,92,93,5,10,0,0,93,94,1,0,0,0,94,95,6,15,0,0,95,32,1,0,0,0,
        96,98,7,5,0,0,97,96,1,0,0,0,98,99,1,0,0,0,99,97,1,0,0,0,99,100,1,
        0,0,0,100,101,1,0,0,0,101,102,6,16,0,0,102,34,1,0,0,0,7,0,48,66,
        73,84,90,99,1,6,0,0
    ];

    private static __ATN: antlr.ATN;
    public static get _ATN(): antlr.ATN {
        if (!packetLexer.__ATN) {
            packetLexer.__ATN = new antlr.ATNDeserializer().deserialize(packetLexer._serializedATN);
        }

        return packetLexer.__ATN;
    }


    private static readonly vocabulary = new antlr.Vocabulary(packetLexer.literalNames, packetLexer.symbolicNames, []);

    public override get vocabulary(): antlr.Vocabulary {
        return packetLexer.vocabulary;
    }

    private static readonly decisionsToDFA = packetLexer._ATN.decisionToState.map( (ds: antlr.DecisionState, index: number) => new antlr.DFA(ds, index) );
}
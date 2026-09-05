/**
 * 文件说明：由 packet.g4 自动生成的 ANTLR 语法分析器，将词法标记组织为语法树；修改语法应编辑源文件并重新生成。
 */

// @ts-nocheck

import * as antlr from "antlr4ng";
import { Token } from "antlr4ng";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;


export class packetParser extends antlr.Parser {
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
    public static readonly RULE_program = 0;
    public static readonly RULE_block = 1;
    public static readonly RULE_definition = 2;
    public static readonly RULE_fieldDef = 3;
    public static readonly RULE_rangeDef = 4;
    public static readonly RULE_startPos = 5;
    public static readonly RULE_plusNumer = 6;
    public static readonly RULE_posLabel = 7;
    public static readonly RULE_bitRange = 8;
    public static readonly RULE_renderLen = 9;
    public static readonly RULE_expr = 10;
    public static readonly RULE_term = 11;
    public static readonly RULE_factor = 12;

    public static readonly literalNames = [
        null, "'{'", "'}'", "':'", "'['", "']'", null, "'+'", "'-'", "'*'", 
        "'/'", "'('", "')'"
    ];

    public static readonly symbolicNames = [
        null, null, null, null, null, null, "NUMBER", "PLUS", "MINUS", "STAR", 
        "SLASH", "LPAREN", "RPAREN", "ID", "STRING", "COMMENT", "NEWLINE", 
        "WS"
    ];
    public static readonly ruleNames = [
        "program", "block", "definition", "fieldDef", "rangeDef", "startPos", 
        "plusNumer", "posLabel", "bitRange", "renderLen", "expr", "term", 
        "factor",
    ];

    public get grammarFileName(): string { return "packet.g4"; }
    public get literalNames(): (string | null)[] { return packetParser.literalNames; }
    public get symbolicNames(): (string | null)[] { return packetParser.symbolicNames; }
    public get ruleNames(): string[] { return packetParser.ruleNames; }
    public get serializedATN(): number[] { return packetParser._serializedATN; }

    protected createFailedPredicateException(predicate?: string, message?: string): antlr.FailedPredicateException {
        return new antlr.FailedPredicateException(this, predicate, message);
    }

    public constructor(input: antlr.TokenStream) {
        super(input);
        this.interpreter = new antlr.ParserATNSimulator(this, packetParser._ATN, packetParser.decisionsToDFA, new antlr.PredictionContextCache());
    }
    public program(): ProgramContext {
        let localContext = new ProgramContext(this.context, this.state);
        this.enterRule(localContext, 0, packetParser.RULE_program);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 29;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 208) !== 0)) {
                {
                {
                this.state = 26;
                this.definition();
                }
                }
                this.state = 31;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 32;
            this.match(packetParser.EOF);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public block(): BlockContext {
        let localContext = new BlockContext(this.context, this.state);
        this.enterRule(localContext, 2, packetParser.RULE_block);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 34;
            this.match(packetParser.T__0);
            this.state = 38;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 208) !== 0)) {
                {
                {
                this.state = 35;
                this.definition();
                }
                }
                this.state = 40;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 41;
            this.match(packetParser.T__1);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public definition(): DefinitionContext {
        let localContext = new DefinitionContext(this.context, this.state);
        this.enterRule(localContext, 4, packetParser.RULE_definition);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 43;
            this.fieldDef();
            this.state = 45;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 1) {
                {
                this.state = 44;
                this.block();
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public fieldDef(): FieldDefContext {
        let localContext = new FieldDefContext(this.context, this.state);
        this.enterRule(localContext, 6, packetParser.RULE_fieldDef);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 48;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 4) {
                {
                this.state = 47;
                this.renderLen();
                }
            }

            this.state = 50;
            this.rangeDef();
            this.state = 52;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 4) {
                {
                this.state = 51;
                this.renderLen();
                }
            }

            this.state = 54;
            this.match(packetParser.T__2);
            this.state = 55;
            this.match(packetParser.STRING);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public rangeDef(): RangeDefContext {
        let localContext = new RangeDefContext(this.context, this.state);
        this.enterRule(localContext, 8, packetParser.RULE_rangeDef);
        try {
            this.state = 60;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 5, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 57;
                this.startPos();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 58;
                this.plusNumer();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 59;
                this.bitRange();
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public startPos(): StartPosContext {
        let localContext = new StartPosContext(this.context, this.state);
        this.enterRule(localContext, 10, packetParser.RULE_startPos);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 62;
            this.match(packetParser.NUMBER);
            this.state = 64;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 6, this.context) ) {
            case 1:
                {
                this.state = 63;
                this.posLabel();
                }
                break;
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public plusNumer(): PlusNumerContext {
        let localContext = new PlusNumerContext(this.context, this.state);
        this.enterRule(localContext, 12, packetParser.RULE_plusNumer);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 66;
            this.match(packetParser.PLUS);
            this.state = 67;
            this.match(packetParser.NUMBER);
            this.state = 69;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 7, this.context) ) {
            case 1:
                {
                this.state = 68;
                this.posLabel();
                }
                break;
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public posLabel(): PosLabelContext {
        let localContext = new PosLabelContext(this.context, this.state);
        this.enterRule(localContext, 14, packetParser.RULE_posLabel);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 71;
            this.match(packetParser.T__3);
            this.state = 72;
            this.expr();
            this.state = 73;
            this.match(packetParser.T__4);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public bitRange(): BitRangeContext {
        let localContext = new BitRangeContext(this.context, this.state);
        this.enterRule(localContext, 16, packetParser.RULE_bitRange);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 75;
            this.match(packetParser.NUMBER);
            this.state = 77;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 4) {
                {
                this.state = 76;
                this.posLabel();
                }
            }

            this.state = 79;
            this.match(packetParser.MINUS);
            this.state = 80;
            this.match(packetParser.NUMBER);
            this.state = 82;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 9, this.context) ) {
            case 1:
                {
                this.state = 81;
                this.posLabel();
                }
                break;
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public renderLen(): RenderLenContext {
        let localContext = new RenderLenContext(this.context, this.state);
        this.enterRule(localContext, 18, packetParser.RULE_renderLen);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 84;
            this.match(packetParser.T__3);
            this.state = 85;
            this.match(packetParser.PLUS);
            this.state = 86;
            this.match(packetParser.NUMBER);
            this.state = 87;
            this.match(packetParser.T__4);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public expr(): ExprContext {
        let localContext = new ExprContext(this.context, this.state);
        this.enterRule(localContext, 20, packetParser.RULE_expr);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 89;
            this.term();
            this.state = 94;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 7 || _la === 8) {
                {
                {
                this.state = 90;
                _la = this.tokenStream.LA(1);
                if(!(_la === 7 || _la === 8)) {
                this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 91;
                this.term();
                }
                }
                this.state = 96;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public term(): TermContext {
        let localContext = new TermContext(this.context, this.state);
        this.enterRule(localContext, 22, packetParser.RULE_term);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 97;
            this.factor();
            this.state = 102;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 9 || _la === 10) {
                {
                {
                this.state = 98;
                _la = this.tokenStream.LA(1);
                if(!(_la === 9 || _la === 10)) {
                this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 99;
                this.factor();
                }
                }
                this.state = 104;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public factor(): FactorContext {
        let localContext = new FactorContext(this.context, this.state);
        this.enterRule(localContext, 24, packetParser.RULE_factor);
        try {
            this.state = 111;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case packetParser.NUMBER:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 105;
                this.match(packetParser.NUMBER);
                }
                break;
            case packetParser.ID:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 106;
                this.match(packetParser.ID);
                }
                break;
            case packetParser.LPAREN:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 107;
                this.match(packetParser.LPAREN);
                this.state = 108;
                this.expr();
                this.state = 109;
                this.match(packetParser.RPAREN);
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }

    public static readonly _serializedATN: number[] = [
        4,1,17,114,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,
        6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,1,0,5,0,
        28,8,0,10,0,12,0,31,9,0,1,0,1,0,1,1,1,1,5,1,37,8,1,10,1,12,1,40,
        9,1,1,1,1,1,1,2,1,2,3,2,46,8,2,1,3,3,3,49,8,3,1,3,1,3,3,3,53,8,3,
        1,3,1,3,1,3,1,4,1,4,1,4,3,4,61,8,4,1,5,1,5,3,5,65,8,5,1,6,1,6,1,
        6,3,6,70,8,6,1,7,1,7,1,7,1,7,1,8,1,8,3,8,78,8,8,1,8,1,8,1,8,3,8,
        83,8,8,1,9,1,9,1,9,1,9,1,9,1,10,1,10,1,10,5,10,93,8,10,10,10,12,
        10,96,9,10,1,11,1,11,1,11,5,11,101,8,11,10,11,12,11,104,9,11,1,12,
        1,12,1,12,1,12,1,12,1,12,3,12,112,8,12,1,12,0,0,13,0,2,4,6,8,10,
        12,14,16,18,20,22,24,0,2,1,0,7,8,1,0,9,10,115,0,29,1,0,0,0,2,34,
        1,0,0,0,4,43,1,0,0,0,6,48,1,0,0,0,8,60,1,0,0,0,10,62,1,0,0,0,12,
        66,1,0,0,0,14,71,1,0,0,0,16,75,1,0,0,0,18,84,1,0,0,0,20,89,1,0,0,
        0,22,97,1,0,0,0,24,111,1,0,0,0,26,28,3,4,2,0,27,26,1,0,0,0,28,31,
        1,0,0,0,29,27,1,0,0,0,29,30,1,0,0,0,30,32,1,0,0,0,31,29,1,0,0,0,
        32,33,5,0,0,1,33,1,1,0,0,0,34,38,5,1,0,0,35,37,3,4,2,0,36,35,1,0,
        0,0,37,40,1,0,0,0,38,36,1,0,0,0,38,39,1,0,0,0,39,41,1,0,0,0,40,38,
        1,0,0,0,41,42,5,2,0,0,42,3,1,0,0,0,43,45,3,6,3,0,44,46,3,2,1,0,45,
        44,1,0,0,0,45,46,1,0,0,0,46,5,1,0,0,0,47,49,3,18,9,0,48,47,1,0,0,
        0,48,49,1,0,0,0,49,50,1,0,0,0,50,52,3,8,4,0,51,53,3,18,9,0,52,51,
        1,0,0,0,52,53,1,0,0,0,53,54,1,0,0,0,54,55,5,3,0,0,55,56,5,14,0,0,
        56,7,1,0,0,0,57,61,3,10,5,0,58,61,3,12,6,0,59,61,3,16,8,0,60,57,
        1,0,0,0,60,58,1,0,0,0,60,59,1,0,0,0,61,9,1,0,0,0,62,64,5,6,0,0,63,
        65,3,14,7,0,64,63,1,0,0,0,64,65,1,0,0,0,65,11,1,0,0,0,66,67,5,7,
        0,0,67,69,5,6,0,0,68,70,3,14,7,0,69,68,1,0,0,0,69,70,1,0,0,0,70,
        13,1,0,0,0,71,72,5,4,0,0,72,73,3,20,10,0,73,74,5,5,0,0,74,15,1,0,
        0,0,75,77,5,6,0,0,76,78,3,14,7,0,77,76,1,0,0,0,77,78,1,0,0,0,78,
        79,1,0,0,0,79,80,5,8,0,0,80,82,5,6,0,0,81,83,3,14,7,0,82,81,1,0,
        0,0,82,83,1,0,0,0,83,17,1,0,0,0,84,85,5,4,0,0,85,86,5,7,0,0,86,87,
        5,6,0,0,87,88,5,5,0,0,88,19,1,0,0,0,89,94,3,22,11,0,90,91,7,0,0,
        0,91,93,3,22,11,0,92,90,1,0,0,0,93,96,1,0,0,0,94,92,1,0,0,0,94,95,
        1,0,0,0,95,21,1,0,0,0,96,94,1,0,0,0,97,102,3,24,12,0,98,99,7,1,0,
        0,99,101,3,24,12,0,100,98,1,0,0,0,101,104,1,0,0,0,102,100,1,0,0,
        0,102,103,1,0,0,0,103,23,1,0,0,0,104,102,1,0,0,0,105,112,5,6,0,0,
        106,112,5,13,0,0,107,108,5,11,0,0,108,109,3,20,10,0,109,110,5,12,
        0,0,110,112,1,0,0,0,111,105,1,0,0,0,111,106,1,0,0,0,111,107,1,0,
        0,0,112,25,1,0,0,0,13,29,38,45,48,52,60,64,69,77,82,94,102,111
    ];

    private static __ATN: antlr.ATN;
    public static get _ATN(): antlr.ATN {
        if (!packetParser.__ATN) {
            packetParser.__ATN = new antlr.ATNDeserializer().deserialize(packetParser._serializedATN);
        }

        return packetParser.__ATN;
    }


    private static readonly vocabulary = new antlr.Vocabulary(packetParser.literalNames, packetParser.symbolicNames, []);

    public override get vocabulary(): antlr.Vocabulary {
        return packetParser.vocabulary;
    }

    private static readonly decisionsToDFA = packetParser._ATN.decisionToState.map( (ds: antlr.DecisionState, index: number) => new antlr.DFA(ds, index) );
}

export class ProgramContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public EOF(): antlr.TerminalNode {
        return this.getToken(packetParser.EOF, 0)!;
    }
    public definition(): DefinitionContext[];
    public definition(i: number): DefinitionContext | null;
    public definition(i?: number): DefinitionContext[] | DefinitionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(DefinitionContext);
        }

        return this.getRuleContext(i, DefinitionContext);
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_program;
    }
}


export class BlockContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public definition(): DefinitionContext[];
    public definition(i: number): DefinitionContext | null;
    public definition(i?: number): DefinitionContext[] | DefinitionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(DefinitionContext);
        }

        return this.getRuleContext(i, DefinitionContext);
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_block;
    }
}


export class DefinitionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public fieldDef(): FieldDefContext {
        return this.getRuleContext(0, FieldDefContext)!;
    }
    public block(): BlockContext | null {
        return this.getRuleContext(0, BlockContext);
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_definition;
    }
}


export class FieldDefContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public rangeDef(): RangeDefContext {
        return this.getRuleContext(0, RangeDefContext)!;
    }
    public STRING(): antlr.TerminalNode {
        return this.getToken(packetParser.STRING, 0)!;
    }
    public renderLen(): RenderLenContext[];
    public renderLen(i: number): RenderLenContext | null;
    public renderLen(i?: number): RenderLenContext[] | RenderLenContext | null {
        if (i === undefined) {
            return this.getRuleContexts(RenderLenContext);
        }

        return this.getRuleContext(i, RenderLenContext);
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_fieldDef;
    }
}


export class RangeDefContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public startPos(): StartPosContext | null {
        return this.getRuleContext(0, StartPosContext);
    }
    public plusNumer(): PlusNumerContext | null {
        return this.getRuleContext(0, PlusNumerContext);
    }
    public bitRange(): BitRangeContext | null {
        return this.getRuleContext(0, BitRangeContext);
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_rangeDef;
    }
}


export class StartPosContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public NUMBER(): antlr.TerminalNode {
        return this.getToken(packetParser.NUMBER, 0)!;
    }
    public posLabel(): PosLabelContext | null {
        return this.getRuleContext(0, PosLabelContext);
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_startPos;
    }
}


export class PlusNumerContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public PLUS(): antlr.TerminalNode {
        return this.getToken(packetParser.PLUS, 0)!;
    }
    public NUMBER(): antlr.TerminalNode {
        return this.getToken(packetParser.NUMBER, 0)!;
    }
    public posLabel(): PosLabelContext | null {
        return this.getRuleContext(0, PosLabelContext);
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_plusNumer;
    }
}


export class PosLabelContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expr(): ExprContext {
        return this.getRuleContext(0, ExprContext)!;
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_posLabel;
    }
}


export class BitRangeContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public NUMBER(): antlr.TerminalNode[];
    public NUMBER(i: number): antlr.TerminalNode | null;
    public NUMBER(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(packetParser.NUMBER);
    	} else {
    		return this.getToken(packetParser.NUMBER, i);
    	}
    }
    public MINUS(): antlr.TerminalNode {
        return this.getToken(packetParser.MINUS, 0)!;
    }
    public posLabel(): PosLabelContext[];
    public posLabel(i: number): PosLabelContext | null;
    public posLabel(i?: number): PosLabelContext[] | PosLabelContext | null {
        if (i === undefined) {
            return this.getRuleContexts(PosLabelContext);
        }

        return this.getRuleContext(i, PosLabelContext);
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_bitRange;
    }
}


export class RenderLenContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public PLUS(): antlr.TerminalNode {
        return this.getToken(packetParser.PLUS, 0)!;
    }
    public NUMBER(): antlr.TerminalNode {
        return this.getToken(packetParser.NUMBER, 0)!;
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_renderLen;
    }
}


export class ExprContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public term(): TermContext[];
    public term(i: number): TermContext | null;
    public term(i?: number): TermContext[] | TermContext | null {
        if (i === undefined) {
            return this.getRuleContexts(TermContext);
        }

        return this.getRuleContext(i, TermContext);
    }
    public PLUS(): antlr.TerminalNode[];
    public PLUS(i: number): antlr.TerminalNode | null;
    public PLUS(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(packetParser.PLUS);
    	} else {
    		return this.getToken(packetParser.PLUS, i);
    	}
    }
    public MINUS(): antlr.TerminalNode[];
    public MINUS(i: number): antlr.TerminalNode | null;
    public MINUS(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(packetParser.MINUS);
    	} else {
    		return this.getToken(packetParser.MINUS, i);
    	}
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_expr;
    }
}


export class TermContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public factor(): FactorContext[];
    public factor(i: number): FactorContext | null;
    public factor(i?: number): FactorContext[] | FactorContext | null {
        if (i === undefined) {
            return this.getRuleContexts(FactorContext);
        }

        return this.getRuleContext(i, FactorContext);
    }
    public STAR(): antlr.TerminalNode[];
    public STAR(i: number): antlr.TerminalNode | null;
    public STAR(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(packetParser.STAR);
    	} else {
    		return this.getToken(packetParser.STAR, i);
    	}
    }
    public SLASH(): antlr.TerminalNode[];
    public SLASH(i: number): antlr.TerminalNode | null;
    public SLASH(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(packetParser.SLASH);
    	} else {
    		return this.getToken(packetParser.SLASH, i);
    	}
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_term;
    }
}


export class FactorContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public NUMBER(): antlr.TerminalNode | null {
        return this.getToken(packetParser.NUMBER, 0);
    }
    public ID(): antlr.TerminalNode | null {
        return this.getToken(packetParser.ID, 0);
    }
    public LPAREN(): antlr.TerminalNode | null {
        return this.getToken(packetParser.LPAREN, 0);
    }
    public expr(): ExprContext | null {
        return this.getRuleContext(0, ExprContext);
    }
    public RPAREN(): antlr.TerminalNode | null {
        return this.getToken(packetParser.RPAREN, 0);
    }
    public override get ruleIndex(): number {
        return packetParser.RULE_factor;
    }
}

import { ComplexityClassifierManager } from '../managers/complexity-classifier.manager';
import { ComplexityClass } from '../../../common/enums/complexity-class.enum';

describe('ComplexityClassifierManager', () => {
  let manager: ComplexityClassifierManager;

  beforeEach(() => {
    manager = new ComplexityClassifierManager();
  });

  // ─── SIMPLE class ──────────────────────────────────────────────────────────
  describe('SIMPLE classification', () => {
    it('classifies a one-word message as SIMPLE', () => {
      const result = manager.classify('Hello');
      expect(result.class).toBe(ComplexityClass.SIMPLE);
      expect(result.wordCount).toBe(1);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('classifies a short FAQ-style question as SIMPLE', () => {
      const result = manager.classify('What is the capital of France?');
      expect(result.class).toBe(ComplexityClass.SIMPLE);
    });

    it('classifies a short greeting as SIMPLE', () => {
      const result = manager.classify('Hi, how are you?');
      expect(result.class).toBe(ComplexityClass.SIMPLE);
    });

    it('classifies an empty-ish message as SIMPLE', () => {
      const result = manager.classify('ok');
      expect(result.class).toBe(ComplexityClass.SIMPLE);
      expect(result.wordCount).toBe(1);
    });
  });

  // ─── MEDIUM class ─────────────────────────────────────────────────────────
  describe('MEDIUM classification', () => {
    it('classifies a paragraph-length question as MEDIUM', () => {
      const msg =
        'Can you explain how JWT authentication works? I want to understand the flow from login to token verification and how the server validates requests.';
      const result = manager.classify(msg);
      expect(result.class).toBe(ComplexityClass.MEDIUM);
    });

    it('classifies a moderate coding question as MEDIUM', () => {
      const msg =
        'Write a Python function that reads a CSV file and returns a list of dictionaries. Handle missing values and encoding errors.';
      const result = manager.classify(msg);
      expect(result.class).toBe(ComplexityClass.MEDIUM);
    });
  });

  // ─── COMPLEX class ────────────────────────────────────────────────────────
  describe('COMPLEX classification', () => {
    it('classifies a multi-step task with many words as COMPLEX', () => {
      // 150+ words with multi-step pattern pushes score above THRESHOLD_COMPLEX (0.60)
      const msg =
        'Step 1: Create a REST API endpoint for user registration with full input validation including email format, password strength requirements, and duplicate check. ' +
        'Step 2: Add an email confirmation flow with a secure token that expires in 24 hours, and a resend confirmation mechanism with rate limiting. ' +
        'Step 3: Implement JWT authentication with refresh token rotation and a secure logout that invalidates the token on the server side. ' +
        'Also make sure to add structured logging for all auth events, correlation IDs for tracing, error handling with user-friendly messages, and unit tests for each component.';
      const result = manager.classify(msg);
      expect([ComplexityClass.COMPLEX, ComplexityClass.EXPERT]).toContain(result.class);
      expect(result.factors).toContain('multi_step');
    });

    it('classifies an architecture question as COMPLEX or EXPERT', () => {
      const msg =
        'I need to design the system architecture for a microservice that handles user authentication at scale. ' +
        'The system should support JWT and OAuth2 with Redis session caching, distributed rate limiting, and graceful degradation under load. ' +
        'Please outline the component structure, API contracts, scalability trade-offs, and database schema design. ' +
        'Also include recommendations for time complexity on the critical authentication path and fault tolerance strategies.';
      const result = manager.classify(msg);
      expect([ComplexityClass.COMPLEX, ComplexityClass.EXPERT]).toContain(result.class);
      expect(result.factors).toContain('expert_domain');
    });
  });

  // ─── EXPERT class ─────────────────────────────────────────────────────────
  describe('EXPERT classification', () => {
    it('classifies a long architecture design request as EXPERT', () => {
      // This message has 300+ words to ensure EXPERT classification
      const msg =
        "I'm building a distributed system for real-time financial data processing at enterprise scale. " +
        'The system needs to handle 500 thousand events per second with strict fault tolerance and high availability requirements. ' +
        'Step 1: Please perform a complete system design covering the event sourcing strategy and how we store state. ' +
        'Step 2: Design the CQRS implementation with separate read and write models and explain the trade-offs. ' +
        'Step 3: Choose and justify a distributed consensus mechanism, comparing Raft versus Paxos versus ZooKeeper for our use case. ' +
        'Additionally, define the Kafka partitioning strategy including the partition key selection, replication factor, and consumer group topology. ' +
        'Cover the cache invalidation approach with Redis and how we handle stale reads during high concurrency. ' +
        'Include a security audit of the data pipeline and identify potential race conditions in the event processing flow. ' +
        'Provide time complexity analysis for the critical paths including event ingestion, state reconstruction, and query serving. ' +
        'Include scalability projections under 10x traffic growth and explain what components would need horizontal scaling first. ' +
        'Finally, describe the microservice architecture boundaries, the API design between services, and the database schema design for both transactional and analytical workloads.';
      const result = manager.classify(msg);
      expect(result.class).toBe(ComplexityClass.EXPERT);
      expect(result.factors).toContain('expert_domain');
    });

    it('detects expert_domain factor for architecture keywords', () => {
      const msg =
        'Perform a security audit on this microservice architecture and identify race conditions.';
      const result = manager.classify(msg);
      expect(result.factors).toContain('expert_domain');
    });
  });

  // ─── Factor detection ─────────────────────────────────────────────────────
  describe('factor detection', () => {
    it('detects multi_step factor for step patterns', () => {
      const result = manager.classify(
        'Step 1: analyze the data. Step 2: build the model. Also output results.',
      );
      expect(result.factors).toContain('multi_step');
    });

    it('detects context_reference factor', () => {
      const result = manager.classify('Based on the above code, refactor the database layer.');
      expect(result.factors).toContain('context_reference');
    });

    it('returns empty factors for a simple message', () => {
      const result = manager.classify('What time is it?');
      expect(result.factors).toHaveLength(0);
    });

    it('can detect multiple factors at once', () => {
      const msg =
        'Based on the above architecture design, step 1: refactor the microservice scalability approach, and step 2: add time complexity analysis.';
      const result = manager.classify(msg);
      expect(result.factors).toContain('multi_step');
      expect(result.factors).toContain('context_reference');
      expect(result.factors).toContain('expert_domain');
    });
  });

  // ─── Score and wordCount ──────────────────────────────────────────────────
  describe('score and wordCount', () => {
    it('returns correct wordCount', () => {
      const result = manager.classify('one two three four five');
      expect(result.wordCount).toBe(5);
    });

    it('score is between 0 and 1 inclusive', () => {
      const longMsg = 'word '.repeat(600).trim();
      const result = manager.classify(longMsg);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('score clamps to 1.0 for very long messages', () => {
      const msg = 'word '.repeat(1000).trim();
      const result = manager.classify(msg);
      expect(result.score).toBe(1);
      expect(result.class).toBe(ComplexityClass.EXPERT);
    });

    it('score for 1 word is very low', () => {
      const result = manager.classify('Hi');
      expect(result.score).toBeLessThan(0.01);
    });
  });
});

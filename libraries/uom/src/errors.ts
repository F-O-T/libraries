/**
 * Base error class for all UOM-related errors
 */
export class UOMError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "UOMError";
      Object.setPrototypeOf(this, UOMError.prototype);
   }
}

/**
 * Error thrown when attempting operations between incompatible units
 */
export class UnitMismatchError extends UOMError {
   public readonly unitA: string;
   public readonly unitB: string;

   constructor(unitA: string, unitB: string) {
      super(
         `Cannot perform operation between incompatible units: ${unitA} and ${unitB}`,
      );
      this.name = "UnitMismatchError";
      this.unitA = unitA;
      this.unitB = unitB;
      Object.setPrototypeOf(this, UnitMismatchError.prototype);
   }
}

/**
 * Error thrown when attempting operations between different categories
 */
export class CategoryMismatchError extends UOMError {
   public readonly categoryA: string;
   public readonly categoryB: string;

   constructor(categoryA: string, categoryB: string) {
      super(
         `Cannot perform operation between different categories: ${categoryA} and ${categoryB}`,
      );
      this.name = "CategoryMismatchError";
      this.categoryA = categoryA;
      this.categoryB = categoryB;
      Object.setPrototypeOf(this, CategoryMismatchError.prototype);
   }
}

/**
 * Error thrown when a unit code is not found in the registry
 */
export class UnknownUnitError extends UOMError {
   public readonly unitCode: string;

   constructor(unitCode: string) {
      super(`Unknown unit code: ${unitCode}`);
      this.name = "UnknownUnitError";
      this.unitCode = unitCode;
      Object.setPrototypeOf(this, UnknownUnitError.prototype);
   }
}

/**
 * Error thrown when a measurement value is invalid
 */
export class InvalidMeasurementError extends UOMError {
   constructor(message: string) {
      super(message);
      this.name = "InvalidMeasurementError";
      Object.setPrototypeOf(this, InvalidMeasurementError.prototype);
   }
}

/**
 * Error thrown when a unit conversion fails
 */
export class ConversionError extends UOMError {
   public readonly fromUnit: string;
   public readonly toUnit: string;
   public readonly reason: string;

   constructor(fromUnit: string, toUnit: string, reason: string) {
      super(`Cannot convert from ${fromUnit} to ${toUnit}: ${reason}`);
      this.name = "ConversionError";
      this.fromUnit = fromUnit;
      this.toUnit = toUnit;
      this.reason = reason;
      Object.setPrototypeOf(this, ConversionError.prototype);
   }
}

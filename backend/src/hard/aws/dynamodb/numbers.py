from decimal import Decimal


def to_db_decimal(value: float | int | str) -> Decimal:
    """
    Converts a number to a `Decimal` DynamoDB will accept.

    `Decimal(some_float)` expands the float's exact binary value, so
    `Decimal(80.1)` is 80.099999999999994315658113919198513031005859375 -- 47
    significant digits. DynamoDB allows 38, and boto3 raises
    `decimal.Inexact` rather than rounding, so storing a set logged at 80.1kg
    failed with a 500. Only weights exactly representable in binary floating
    point (.0, .25, .5, .75) survived.

    Going via `str` keeps the number the caller actually meant: `Decimal("80.1")`
    is exactly 80.1.
    """
    return Decimal(str(value))

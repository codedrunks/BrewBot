export enum DatabaseError {
    UNKNOWN = -1,
    SUCCESS,
    DUPLICATE,
    NOT_FOUND,
    OPERATION_DEPENDS_ON_REQUIRED_RECORD_THAT_WAS_NOT_FOUND,

    // Contest Errors
    NO_CONTEST_SUBMISSION = 100
}